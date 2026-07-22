// NilBot desktop shell. Boots the built SvelteKit server (adapter-node) with
// its data directory in the OS user-data folder, shows a game-style splash
// while it wakes, then opens the main window.
//
// Dev:      npm run desktop        (build + launch; server runs on system node)
// Packaged: electron-builder rebuilds natives and the server runs through
//           Electron's own runtime (utilityProcess).

const { app, BrowserWindow, utilityProcess, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');

const SERVER = path.join(__dirname, '..', 'build', 'index.js');

let splash = null;
let win = null;
let server = null;

// The whole point of the desktop app: campaign data lives with the user,
// not in the repo. data/ + data/store end up under e.g.
// ~/.config/NilBot (linux) / %APPDATA%/NilBot (win) / ~/Library/... (mac).
function dataHome() {
	const dir = app.getPath('userData');
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

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

function startServer(port) {
	const env = {
		...process.env,
		PORT: String(port),
		HOST: '0.0.0.0', // players on the LAN can join the table
		ORIGIN: `http://127.0.0.1:${port}`,
		BODY_SIZE_LIMIT: '104857600'
	};
	const cwd = dataHome();
	if (app.isPackaged) {
		server = utilityProcess.fork(SERVER, [], { cwd, env, stdio: 'pipe' });
	} else {
		// Dev: system node, so node_modules natives stay built for plain node.
		server = spawn(process.env.npm_node_execpath || 'node', [SERVER], { cwd, env });
	}
	server.stdout?.on('data', (d) => console.log('[server]', String(d).trimEnd()));
	server.stderr?.on('data', (d) => console.error('[server]', String(d).trimEnd()));
	server.on('exit', (code) => {
		if (!app.isQuitting && code !== 0 && code !== null) {
			console.error(`server exited with ${code}`);
			app.quit();
		}
	});
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

function showMain(port) {
	win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 960,
		minHeight: 640,
		show: false,
		autoHideMenuBar: true,
		backgroundColor: '#16181d',
		icon: path.join(__dirname, 'icon.png'),
		webPreferences: { contextIsolation: true }
	});
	// External links (Open5e, 2MT credits…) go to the real browser.
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});
	// The game opens on the title screen (falls through to /login on first run).
	win.loadURL(`http://127.0.0.1:${port}/title?app=1`);
	win.once('ready-to-show', () => {
		splash?.destroy();
		splash = null;
		win.show();
	});
}

app.whenReady().then(async () => {
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
	try {
		const port = await freePort();
		startServer(port);
		await waitForServer(port);
		showMain(port);
	} catch (e) {
		console.error(e);
		splash?.destroy();
		app.quit();
	}
});

app.on('before-quit', () => {
	app.isQuitting = true;
	server?.kill();
});

app.on('window-all-closed', () => {
	// Game-app behavior everywhere: closing the window quits (no macOS lurker).
	app.quit();
});
