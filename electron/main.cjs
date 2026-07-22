// NilBot Tabletop shell. Campaigns are local save slots: each one is its own
// world (own database + files) under userData/campaigns/<id>/. The player
// never sees a login — the shell owns identity, creating and signing into a
// local DM account per campaign over HTTP against the unmodified app.
//
// Dev:      npm run desktop   (server runs on system node)
// Packaged: server runs through Electron's utilityProcess (electron-builder
//           rebuilds natives at package time).

const { app, BrowserWindow, utilityProcess, shell, ipcMain, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const crypto = require('node:crypto');
const dgram = require('node:dgram');

const SERVER = path.join(__dirname, '..', 'build', 'index.js');
const COOKIE = 'nilbot_session';

let win = null;
let server = null;
let currentPort = null;

// ---------------------------------------------------------------- prefs

function prefsPath() {
	return path.join(app.getPath('userData'), 'prefs.json');
}
function loadPrefs() {
	try {
		return JSON.parse(fs.readFileSync(prefsPath(), 'utf8'));
	} catch {
		return {};
	}
}
function savePrefs(patch) {
	const prefs = { ...loadPrefs(), ...patch };
	fs.writeFileSync(prefsPath(), JSON.stringify(prefs, null, '\t'));
	return prefs;
}

// ---------------------------------------------------------------- campaigns

function campaignsRoot() {
	const dir = path.join(app.getPath('userData'), 'campaigns');
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}
function registryPath() {
	return path.join(campaignsRoot(), 'campaigns.json');
}
function loadRegistry() {
	try {
		return JSON.parse(fs.readFileSync(registryPath(), 'utf8'));
	} catch {
		return { campaigns: [] };
	}
}
function saveRegistry(reg) {
	fs.writeFileSync(registryPath(), JSON.stringify(reg, null, '\t'));
}

// ---------------------------------------------------------------- server

function freePort() {
	return new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.listen(0, '127.0.0.1', () => {
			const port = srv.address().port;
			srv.close(() => resolve(port));
		});
		srv.on('error', reject);
	});
}

function portFree(port) {
	return new Promise((resolve) => {
		const srv = net.createServer();
		srv.once('error', () => resolve(false));
		srv.listen(port, '0.0.0.0', () => srv.close(() => resolve(true)));
	});
}

function stopServer() {
	if (server) {
		server.kill();
		server = null;
		currentPort = null;
	}
}

function startServer(port, cwd) {
	const env = {
		...process.env,
		PORT: String(port),
		HOST: '0.0.0.0', // players on the LAN can open Battle Ready / canvas
		ORIGIN: `http://127.0.0.1:${port}`,
		BODY_SIZE_LIMIT: '104857600',
		// Local worlds are bounded by the disk, not a hosting quota.
		STORAGE_CAP_MB: '1048576'
	};
	fs.mkdirSync(cwd, { recursive: true });
	if (app.isPackaged) {
		server = utilityProcess.fork(SERVER, [], { cwd, env, stdio: 'pipe' });
	} else {
		server = spawn(process.env.npm_node_execpath || 'node', [SERVER], { cwd, env });
	}
	server.stdout?.on('data', (d) => console.log('[server]', String(d).trimEnd()));
	server.stderr?.on('data', (d) => console.error('[server]', String(d).trimEnd()));
	currentPort = port;
}

function waitForServer(port, tries = 120) {
	return new Promise((resolve, reject) => {
		const attempt = (left) => {
			const req = http.get({ host: '127.0.0.1', port, path: '/login', timeout: 1000 }, (res) => {
				res.resume();
				res.statusCode && res.statusCode < 500 ? resolve() : retry(left);
			});
			req.on('error', () => retry(left));
			req.on('timeout', () => {
				req.destroy();
				retry(left);
			});
		};
		const retry = (left) =>
			left > 0 ? setTimeout(() => attempt(left - 1), 250) : reject(new Error('server never woke'));
		attempt(tries);
	});
}

// Silent auth against the unmodified app: POST the login/setup form actions,
// harvest the session cookie, plant it in the window's cookie jar.
function postForm(port, actionPath, fields) {
	return new Promise((resolve, reject) => {
		const body = new URLSearchParams(fields).toString();
		const req = http.request(
			{
				host: '127.0.0.1',
				port,
				path: actionPath,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(body),
					Origin: `http://127.0.0.1:${port}`
				}
			},
			(res) => {
				res.resume();
				res.on('end', () => resolve(res));
			}
		);
		req.on('error', reject);
		req.end(body);
	});
}

function sessionCookieFrom(res) {
	for (const c of res.headers['set-cookie'] ?? []) {
		const m = c.match(new RegExp(`^${COOKIE}=([^;]+)`));
		if (m) return m[1];
	}
	return null;
}

async function authenticate(port, meta) {
	// Existing account first; fall back to first-run setup.
	let res = await postForm(port, '/login?/login', {
		username: meta.user,
		password: meta.pass
	});
	let token = sessionCookieFrom(res);
	if (!token) {
		res = await postForm(port, '/login?/setup', {
			username: meta.user,
			password: meta.pass,
			confirm: meta.pass
		});
		token = sessionCookieFrom(res);
	}
	if (!token) throw new Error('could not sign into the campaign world');
	await win.webContents.session.cookies.set({
		url: `http://127.0.0.1:${port}`,
		name: COOKIE,
		value: token,
		httpOnly: true,
		sameSite: 'lax'
	});
}

// ---------------------------------------------------------------- windows

function gameFile(name) {
	win.loadFile(path.join(__dirname, name));
}

function showMain() {
	const prefs = loadPrefs();
	win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 960,
		minHeight: 640,
		fullscreen: !!prefs.fullscreen,
		show: false,
		autoHideMenuBar: true,
		backgroundColor: '#07070a',
		icon: path.join(__dirname, 'icon.png'),
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.cjs')
		}
	});
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	// The app's own ◀ MENU element links to /__title; the shell intercepts
	// the navigation and returns to the title screen. No injection needed —
	// this app IS the game.
	win.webContents.on('will-navigate', (e, url) => {
		if (url.includes('/__title')) {
			e.preventDefault();
			gameFile('title.html');
		}
		if (url.startsWith('mailto:')) {
			e.preventDefault();
			shell.openExternal(url);
		}
	});
	// A dead address (world closed, port changed) must never strand the
	// player on a black screen — fall back to the title.
	win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
		if (isMainFrame && code !== -3 && String(url).startsWith('http')) {
			gameFile('title.html');
		}
	});

	let revealed = false;
	const reveal = () => {
		if (revealed) return;
		revealed = true;
		win.show();
	};
	win.once('ready-to-show', reveal);
	win.webContents.once('did-finish-load', reveal);
	setTimeout(reveal, 4000);

	// Boot sequence: studio card, then the title screen.
	gameFile('intro.html');
}

// ---------------------------------------------------------------- discovery
// An open world announces itself on the LAN (UDP beacon, every 3s); the
// Join screen lists tables it hears. Presence only — the invite key is
// still the only thing that opens the door.

const BEACON_PORT = 47800;
let beacon = null;
let beaconTimer = null;
const heard = new Map(); // key: address:port -> { name, dmName, at }

function startBeacon(port, name) {
	stopBeacon();
	beacon = dgram.createSocket({ type: 'udp4', reuseAddr: true });
	beacon.bind(() => {
		try {
			beacon.setBroadcast(true);
		} catch {}
		const msg = Buffer.from(JSON.stringify({ nb: 'table', name, port }));
		beaconTimer = setInterval(() => {
			for (const target of ['255.255.255.255', '127.0.0.1']) {
				beacon?.send(msg, BEACON_PORT, target, () => {});
			}
		}, 3000);
	});
}
function stopBeacon() {
	if (beaconTimer) clearInterval(beaconTimer);
	beaconTimer = null;
	beacon?.close();
	beacon = null;
}

const listener = dgram.createSocket({ type: 'udp4', reuseAddr: true });
listener.on('message', (msg, rinfo) => {
	try {
		const d = JSON.parse(String(msg));
		if (d.nb === 'table' && d.port) {
			heard.set(`${rinfo.address}:${d.port}`, {
				name: String(d.name ?? 'a table'),
				address: `${rinfo.address}:${d.port}`,
				at: Date.now()
			});
		}
	} catch {}
});
listener.on('error', () => {});
try {
	listener.bind(BEACON_PORT);
} catch {}

ipcMain.handle('tables:discover', () => {
	const now = Date.now();
	return [...heard.values()]
		.filter((t) => now - t.at < 10000)
		.map(({ name, address }) => ({ name, address }));
});

// ---------------------------------------------------------------- joining
// The player's side of the invite handshake: POST the key to the DM's
// world, keep the session, remember the table.

function parseAddr(raw) {
	const m = String(raw ?? '').trim().match(/^([a-zA-Z0-9.-]+):(\d{2,5})$/);
	return m ? { host: m[1], port: Number(m[2]) } : null;
}

function postJson(host, port, pathName, payload) {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify(payload);
		const req = http.request(
			{
				host,
				port,
				path: pathName,
				method: 'POST',
				timeout: 8000,
				headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
			},
			(res) => {
				let data = '';
				res.on('data', (d) => (data += d));
				res.on('end', () => {
					try {
						resolve({ status: res.statusCode, body: JSON.parse(data) });
					} catch {
						resolve({ status: res.statusCode, body: {} });
					}
				});
			}
		);
		req.on('error', reject);
		req.on('timeout', () => {
			req.destroy();
			reject(new Error('timeout'));
		});
		req.end(body);
	});
}

async function joinTable(rawAddr, code) {
	const addr = parseAddr(rawAddr);
	if (!addr) return { error: 'That invite looks damaged — no table address in it.' };
	try {
		const res = await postJson(addr.host, addr.port, '/api/join', { code: String(code ?? '') });
		if (res.status !== 200 || !res.body.ok) {
			return { error: res.body.error ?? 'The table refused the key.' };
		}
		const reg = loadRegistry();
		reg.joined = reg.joined ?? [];
		const id = crypto.randomBytes(6).toString('hex');
		reg.joined.push({
			id,
			address: `${addr.host}:${addr.port}`,
			token: res.body.token,
			playerName: res.body.playerName,
			dmName: res.body.dmName,
			joinedAt: new Date().toISOString()
		});
		saveRegistry(reg);
		return { ok: true, id };
	} catch {
		return { error: 'Could not reach that table. Is the DM\'s world open?' };
	}
}

ipcMain.handle('tables:join', (_e, rawAddr, code) => joinTable(rawAddr, code));

// nilbot://join/<host:port>/<KEY> — clicking an invite anywhere on the
// machine opens the game and seats the player. That's "accept".
async function handleInviteUrl(raw) {
	try {
		const u = new URL(raw);
		if (u.protocol !== 'nilbot:') return;
		const parts = (u.host + u.pathname).split('/').filter(Boolean);
		const [action, addr, key] = parts.length === 3 ? parts : ['join', parts[0], parts[1]];
		if (action !== 'join' || !addr || !key) return;
		const res = await joinTable(addr, key);
		if (res.ok) {
			await ipcOpenTable(res.id);
		} else if (win) {
			gameFile('join.html');
		}
	} catch {}
}

let ipcOpenTable = async () => {};

ipcMain.handle('tables:list', async () => {
	const reg = loadRegistry();
	const rows = reg.joined ?? [];
	// Presence by asking each saved table directly — point-to-point, nothing
	// broadcast, invisible to the rest of the network.
	const open = await Promise.all(
		rows.map((t) => {
			const [host, port] = t.address.split(':');
			return reachable(host, Number(port));
		})
	);
	return rows.map(({ id, address, playerName, dmName, joinedAt }, i) => ({
		id,
		address,
		playerName,
		dmName,
		joinedAt,
		open: open[i]
	}));
});

function reachable(host, port) {
	return new Promise((resolve) => {
		const req = http.get({ host, port, path: '/login', timeout: 3000 }, (res) => {
			res.resume();
			resolve(true);
		});
		req.on('error', () => resolve(false));
		req.on('timeout', () => {
			req.destroy();
			resolve(false);
		});
	});
}

ipcOpenTable = async (id, opts) => {
	const reg = loadRegistry();
	const t = (reg.joined ?? []).find((x) => x.id === id);
	if (!t) return { error: 'Table not found.' };
	const [host, port] = t.address.split(':');
	if (!(await reachable(host, Number(port)))) {
		return { error: "Can't reach the table — is the DM's world open right now?" };
	}
	await win.webContents.session.cookies.set({
		url: `http://${host}:${port}`,
		name: COOKIE,
		value: t.token,
		httpOnly: true,
		sameSite: 'lax'
	});
	const target = `http://${t.address}/table`;
	// Like any game: the invite/seat takes over the window. A second window
	// is an explicit request (the DM testing both roles side by side).
	if (opts && opts.second) {
		openSeatWindow(target);
		return { ok: true, second: true };
	}
	win.loadURL(target);
	return { ok: true };
};
ipcMain.handle('tables:open', (_e, id, opts) => ipcOpenTable(id, opts));

let seatWin = null;
function openSeatWindow(target) {
	if (seatWin && !seatWin.isDestroyed()) {
		seatWin.loadURL(target);
		seatWin.focus();
		return;
	}
	seatWin = new BrowserWindow({
		width: 1100,
		height: 780,
		autoHideMenuBar: true,
		backgroundColor: '#12142a',
		icon: path.join(__dirname, 'icon.png'),
		webPreferences: { contextIsolation: true }
	});
	// The seat's MENU closes the window (the main window has the title).
	seatWin.webContents.on('will-navigate', (e, url) => {
		if (url.includes('/__title')) {
			e.preventDefault();
			seatWin.close();
		}
	});
	seatWin.webContents.on('did-fail-load', (_e, code) => {
		if (code !== -3) seatWin?.close();
	});
	seatWin.on('closed', () => (seatWin = null));
	seatWin.loadURL(target);
}

ipcMain.handle('tables:forget', (_e, id) => {
	const reg = loadRegistry();
	reg.joined = (reg.joined ?? []).filter((x) => x.id !== id);
	saveRegistry(reg);
	return { ok: true };
});

// ---------------------------------------------------------------- IPC

ipcMain.handle('campaigns:list', () => {
	const reg = loadRegistry();
	return reg.campaigns.map(({ id, name, created, lastPlayed }) => ({
		id,
		name,
		created,
		lastPlayed
	}));
});

ipcMain.handle('campaigns:create', (_e, rawName) => {
	const name = String(rawName ?? '').trim();
	if (!name) return { error: 'The campaign needs a name.' };
	const reg = loadRegistry();
	const id = crypto.randomBytes(6).toString('hex');
	reg.campaigns.push({
		id,
		name,
		user: 'Dungeon Master',
		pass: crypto.randomBytes(18).toString('hex'),
		created: new Date().toISOString(),
		lastPlayed: null
	});
	saveRegistry(reg);
	return { ok: true, id };
});

ipcMain.handle('campaigns:open', async (_e, id) => {
	const reg = loadRegistry();
	const meta = reg.campaigns.find((c) => c.id === id);
	if (!meta) return { error: 'Campaign not found.' };
	try {
		// Re-entering the world that's already running: don't restart the
		// server — connected players keep their seats.
		if (server && currentPort && meta.port === currentPort) {
			await authenticate(currentPort, meta);
			meta.lastPlayed = new Date().toISOString();
			saveRegistry(reg);
			win.loadURL(`http://127.0.0.1:${currentPort}/`);
			return { ok: true };
		}
		stopServer();
		// A campaign keeps its port across restarts so players' saved table
		// addresses stay valid; fall back to a fresh one only if it's taken.
		let port = meta.port && (await portFree(meta.port)) ? meta.port : await freePort();
		meta.port = port;
		saveRegistry(reg);
		startServer(port, path.join(campaignsRoot(), meta.id));
		await waitForServer(port);
		// Private by default: the table only announces itself on the LAN when
		// the DM has switched announcing on (Settings).
		if (loadPrefs().announceLAN) startBeacon(port, meta.name);
		await authenticate(port, meta);
		meta.lastPlayed = new Date().toISOString();
		saveRegistry(reg);
		win.loadURL(`http://127.0.0.1:${port}/`);
		return { ok: true };
	} catch (e) {
		console.error(e);
		return { error: 'The campaign world failed to wake. Check the logs.' };
	}
});

ipcMain.handle('campaigns:remove', async (_e, id) => {
	const reg = loadRegistry();
	const meta = reg.campaigns.find((c) => c.id === id);
	if (!meta) return { ok: true };
	const { response } = await dialog.showMessageBox(win, {
		type: 'warning',
		buttons: ['Cancel', 'Remove from list'],
		defaultId: 0,
		cancelId: 0,
		title: 'Remove campaign?',
		message: `Remove “${meta.name}” from the list?`,
		detail: 'Its files stay on disk — nothing is deleted. It can be restored by hand later.'
	});
	if (response !== 1) return { ok: false };
	reg.campaigns = reg.campaigns.filter((c) => c.id !== id);
	saveRegistry(reg);
	return { ok: true };
});

ipcMain.handle('settings:info', () => ({
	version: app.getVersion(),
	dataPath: campaignsRoot(),
	fullscreen: !!win?.isFullScreen(),
	announceLAN: !!loadPrefs().announceLAN
}));
ipcMain.handle('settings:fullscreen', () => {
	if (!win) return false;
	win.setFullScreen(!win.isFullScreen());
	savePrefs({ fullscreen: win.isFullScreen() });
	return win.isFullScreen();
});
ipcMain.handle('settings:open-data', () => shell.openPath(campaignsRoot()));
ipcMain.handle('settings:announce', (_e, on) => {
	savePrefs({ announceLAN: !!on });
	if (on && server && currentPort) {
		const reg = loadRegistry();
		const meta = reg.campaigns.find((c) => c.port === currentPort);
		startBeacon(currentPort, meta?.name ?? 'a table');
	} else {
		stopBeacon();
	}
	return !!on;
});

// ---------------------------------------------------------------- lifecycle

app.whenReady().then(() => {
	if (!app.requestSingleInstanceLock()) {
		app.quit();
		return;
	}
	app.setAsDefaultProtocolClient('nilbot');
	app.on('second-instance', (_e, argv) => {
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
		const url = argv.find((a) => a.startsWith('nilbot://'));
		if (url) handleInviteUrl(url);
	});
	app.on('open-url', (_e, url) => handleInviteUrl(url));
	const bootUrl = process.argv.find((a) => a.startsWith('nilbot://'));
	if (bootUrl) setTimeout(() => handleInviteUrl(bootUrl), 1500);
	showMain();
});

app.on('before-quit', () => {
	app.isQuitting = true;
	stopBeacon();
	stopServer();
});

app.on('window-all-closed', () => {
	app.quit();
});
