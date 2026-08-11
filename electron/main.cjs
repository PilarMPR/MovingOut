// The desktop shell. It has one job: put the built app in a window, from a real
// origin.
//
// The origin is the part worth explaining. Every scenario, every price revision
// and the whole seeded checklist live in localStorage, and Chromium keys that
// store to an origin. A `file://` page has an *opaque* origin, so localStorage
// there is either unavailable or silently per-load — which for this app means
// the Historial empties itself. Registering `app:` as a standard, secure scheme
// gives a stable origin (app://movingout), and storage then behaves exactly as
// it does on the web build.
//
// `.cjs` because package.json says "type": "module" and Electron's main process
// is CommonJS.

const { app, BrowserWindow, protocol, net, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const SCHEME = 'app';
const ORIGIN = `${SCHEME}://movingout`;

// Point at the Vite dev server instead of dist/ — `npm run desktop:dev`.
const DEV_SERVER = process.env.ELECTRON_DEV === '1' ? 'http://localhost:5173' : null;

// A note on `--ozone-platform=x11`, which every launch path here passes:
// Chromium's Wayland backend segfaults on this machine's compositor before it
// paints a single frame. X11 (through XWayland) is stable and the app needs
// nothing Wayland offers. It cannot be set from here — ozone picks its backend
// before this file is evaluated, so `app.commandLine.appendSwitch` is too late.
// It lives in the npm scripts and in build.linux.executableArgs instead. This
// is the display backend only; the renderer sandbox stays on.

// Registered before app ready, which is a hard requirement of the API.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

/**
 * The window's paint-before-first-frame colour, read from the token block
 * rather than copied into this file. CLAUDE.md promises that swapping the
 * palette is a one-file change, and a hardcoded hex here would quietly make
 * that false. Falls back to white if the file moves.
 */
function backgroundColor() {
  try {
    const tokens = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'tokens.css'), 'utf8');
    return /--bg:\s*(#[0-9a-fA-F]{3,8})/.exec(tokens)?.[1] ?? '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
}

/** Serve dist/ over app://, and never anything outside it. */
function serveFromDist(request) {
  const { pathname } = new URL(request.url);
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = path.join(DIST, relative);

  // path.join normalises away any ../, so this comparison is the whole guard.
  if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  return net.fetch(pathToFileURL(filePath).toString());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 880,
    minHeight: 600,
    title: 'MovingOut',
    backgroundColor: backgroundColor(),
    autoHideMenuBar: true, // Alt still reveals it, so Ctrl+C/V keep working.
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(DEV_SERVER ?? `${ORIGIN}/index.html`);

  // Anything aimed elsewhere opens in the real browser rather than in a
  // chromeless Electron window with no back button.
  const external = (url) => {
    shell.openExternal(url);
    return { action: 'deny' };
  };
  win.webContents.setWindowOpenHandler(({ url }) => external(url));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(DEV_SERVER ?? ORIGIN)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, serveFromDist);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
