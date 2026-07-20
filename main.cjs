const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 3000;
let mainWindow = null;
let splashWindow = null;
let serverProcess = null;

// Check if the server is already running before trying to start it
function isServerRunning(callback) {
  let finished = false;
  const done = (res) => {
    if (finished) return;
    finished = true;
    callback(res);
  };
  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    done(res.statusCode === 200);
  });
  req.on('error', () => done(false));
  req.setTimeout(800, () => { req.destroy(); done(false); });
}

// Start the Express/Vite backend server
function startServer() {
  const isDev = !app.isPackaged;

  if (isDev) {
    // tsx.cmd is the Windows batch wrapper for dev mode
    const tsxBin = path.join(__dirname, 'node_modules', '.bin', 'tsx.cmd');
    const serverScript = path.join(__dirname, 'server.ts');

    serverProcess = spawn(tsxBin, [serverScript], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
  } else {
    // Production mode: run the compiled server bundle using Electron's bundled Node.js
    const serverScript = path.join(__dirname, 'dist', 'server.cjs');
    
    serverProcess = spawn(process.execPath, [serverScript], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
  }

  serverProcess.stdout?.on('data', (data) => {
    console.log('[SERVER]', data.toString().trim());
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error('[SERVER ERR]', data.toString().trim());
  });

  serverProcess.on('error', (err) => {
    console.error('[SERVER SPAWN ERROR]', err.message);
  });

  serverProcess.on('exit', (code) => {
    console.log('[SERVER] exited with code', code);
  });
}

// Poll until the server responds, then call callback
function waitForServer(callback, retries = 200) {
  isServerRunning((running) => {
    if (running) {
      callback();
    } else if (retries <= 0) {
      console.error('Server did not respond in time — opening anyway');
      callback();
    } else {
      setTimeout(() => waitForServer(callback, retries - 1), 800);
    }
  });
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'public', 'favicon.png'),
    webPreferences: { nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(__dirname, 'loading.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#020617', // matches app's slate-950 bg
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 32
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public', 'favicon.png'),
    show: false // HIDDEN until loaded
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.webContents.once('did-finish-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Open any external links in the system browser, not inside the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createSplash();

  // Check if a server is already running (e.g. started by concurrently/npm run dev)
  // If not, start it ourselves
  isServerRunning((alreadyRunning) => {
    if (!alreadyRunning) {
      console.log('[ELECTRON] No server detected — starting server...');
      startServer();
    } else {
      console.log('[ELECTRON] Server already running — connecting...');
    }

    // Either way, wait until the server is ready, then open window
    waitForServer(() => {
      createWindow();
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Kill the server process (if we started it) when the app closes
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
