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

const SERVER = path.join(__dirname, '..', 'build', 'index.js');
const COOKIE = 'nilbot_session';

let splash = null;
let win = null;
let server = null;
let currentPort = null;

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
		BODY_SIZE_LIMIT: '104857600'
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

function showSplash() {
	splash = new BrowserWindow({
		width: 520,
		height: 360,
		frame: false,
		resizable: false,
		alwaysOnTop: true,
		backgroundColor: '#0e0f12',
		webPreferences: { contextIsolation: true }
	});
	splash.loadFile(path.join(__dirname, 'splash.html'));
}

function gameFile(name) {
	win.loadFile(path.join(__dirname, name));
}

function showMain() {
	win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 960,
		minHeight: 640,
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

	// In-app chrome, injected by the shell (the web app stays untouched):
	// a Menu button that returns to the title screen from any app page.
	win.webContents.on('will-navigate', (e, url) => {
		if (url.includes('/__title')) {
			e.preventDefault();
			gameFile('title.html');
		}
	});
	win.webContents.on('did-finish-load', () => {
		if (!win.webContents.getURL().startsWith('http')) return;
		win.webContents
			.executeJavaScript(`(function () {
			if (document.getElementById('nb-menu-btn')) return;
			const b = document.createElement('button');
			b.id = 'nb-menu-btn';
			b.textContent = '\\u2302 Menu';
			Object.assign(b.style, {
				position: 'fixed', bottom: '14px', right: '14px', zIndex: 99999,
				background: 'rgba(16, 17, 22, 0.85)', color: '#b8925c',
				border: '1px solid #3a3325', borderRadius: '8px', padding: '6px 14px',
				font: '600 12px Georgia, serif', letterSpacing: '0.08em',
				cursor: 'pointer', backdropFilter: 'blur(4px)'
			});
			b.onmouseenter = () => (b.style.color = '#e6d9b8');
			b.onmouseleave = () => (b.style.color = '#b8925c');
			b.onclick = () => location.assign('/__title');
			document.body.appendChild(b);
		})();`)
			.catch(() => {});
	});

	let revealed = false;
	const reveal = () => {
		if (revealed) return;
		revealed = true;
		splash?.destroy();
		splash = null;
		win.show();
	};
	win.once('ready-to-show', reveal);
	win.webContents.once('did-finish-load', reveal);
	setTimeout(reveal, 4000);

	gameFile('title.html');
}

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
		stopServer();
		const port = await freePort();
		startServer(port, path.join(campaignsRoot(), meta.id));
		await waitForServer(port);
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
	fullscreen: !!win?.isFullScreen()
}));
ipcMain.handle('settings:fullscreen', () => {
	if (!win) return false;
	win.setFullScreen(!win.isFullScreen());
	return win.isFullScreen();
});
ipcMain.handle('settings:open-data', () => shell.openPath(campaignsRoot()));

// ---------------------------------------------------------------- lifecycle

app.whenReady().then(() => {
	if (!app.requestSingleInstanceLock()) {
		app.quit();
		return;
	}
	app.on('second-instance', () => {
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
	});
	showSplash();
	showMain();
});

app.on('before-quit', () => {
	app.isQuitting = true;
	stopServer();
});

app.on('window-all-closed', () => {
	app.quit();
});
