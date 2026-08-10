// Electron main process — the Humble Object. It wires a real Chromium BrowserView
// (the content) beneath a chrome we draw ourselves (the toolbar), and carries no
// decisions of its own: all logic lives in ../src/* and is unit-tested there.
//
// See README for the environment-variable configuration.

import { app, BrowserWindow, BrowserView, ipcMain, screen } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseConfig } from '../src/config.js';
import { parseScene } from '../src/scene.js';
import { parseCli } from '../src/cli.js';
import {
  classifyNudge,
  isDragStart,
  isDragEnd,
  isDragCancel,
  grabOffset,
  dragTarget,
} from '../src/move.js';

const here = dirname(fileURLToPath(import.meta.url));
const TOOLBAR_H = 84; // tab strip (40) + toolbar (44); must match toolbar.html
const DRAG_POLL_MS = 16; // ~60 Hz — matched to display refresh, not to event rate

// Normalize argv shape before handing to the (host-agnostic) parser:
//   • dev (`electron .`):         [electronPath, appPath, ...userArgs]  → slice(2)
//   • packaged (prop-window.exe): [exePath,               ...userArgs]  → slice(1)
// `process.defaultApp` is truthy only when Electron runs an app passed as an
// argument (i.e., dev mode). Without this discriminator, the packaged .exe
// silently drops the FIRST user flag — e.g. `--borderless --url X` loses
// `--borderless` and falls back to framed chrome; `--url X` loses `--url` and
// falls back to welcome.html.
const cli = parseCli(process.argv.slice(process.defaultApp ? 2 : 1));

let scene = {};
if (cli.sceneFile) {
  const raw = JSON.parse(readFileSync(resolve(cli.sceneFile), 'utf-8'));
  scene = parseScene(raw);
}

const cfg = parseConfig(
  process.env,
  { load: pathToFileURL(join(here, 'welcome.html')).href },
  scene,
);

// CLI flags win over env/scene: --url swaps the loaded page, --borderless drops
// our own chrome so the page can draw its own frame (e.g. the Kali window mockup),
// --x/--y place the window for the shot.
if (cli.url) cfg.load = cli.url;
if (cli.borderless) cfg.borderless = true;
if (cli.x !== null) cfg.x = cli.x;
if (cli.y !== null) cfg.y = cli.y;

// Electron takes x and y together; a lone coordinate says nothing, so an
// incomplete pair falls back to the OS's own placement.
const placement = cfg.x === null || cfg.y === null ? {} : { x: cfg.x, y: cfg.y };

let win;
let view;

// Capture the visible window to PNG once the content has settled, then quit —
// shared by the framed and borderless paths (--screenshot).
async function captureThenQuit() {
  // Brief delay lets the page render (fonts, images, layout).
  await new Promise((r) => setTimeout(r, 1500));
  const image = await win.webContents.capturePage();
  const { writeFileSync } = await import('node:fs');
  writeFileSync(resolve(cli.screenshot), image.toPNG());
  app.quit();
}

// Give the operator a way to move a window that offers nothing to grab: Alt+drag
// anywhere on it, Alt+Arrow to nudge, Escape to abandon a drag. Every gesture is
// classified in the main process from Chromium's pre-dispatch input events and
// then cancelled, so the loaded page never sees the grab, never scrolls on our
// arrow keys, and is never modified — which is what makes this work on a page we
// do not own. Decisions live in ../src/move.js; this is only the wiring.
function enableWindowMove(contentsList) {
  let drag = null;

  const movable = () => win && !win.isDestroyed() && !win.isFullScreen();

  const stopDrag = (restore) => {
    if (!drag) return;
    clearInterval(drag.timer);
    if (restore && movable()) win.setPosition(drag.origin.x, drag.origin.y);
    drag = null;
  };

  const startDrag = () => {
    const [x, y] = win.getPosition();
    const offset = grabOffset({ x, y }, screen.getCursorScreenPoint());
    const timer = setInterval(() => {
      if (!movable()) return stopDrag(false);
      const at = dragTarget(offset, screen.getCursorScreenPoint());
      win.setPosition(at.x, at.y);
    }, DRAG_POLL_MS);
    drag = { origin: { x, y }, timer };
  };

  for (const contents of contentsList) {
    contents.on('before-mouse-event', (event, mouse) => {
      if (!drag && isDragStart(mouse) && movable()) {
        event.preventDefault();
        startDrag();
      } else if (drag && isDragEnd(mouse)) {
        event.preventDefault();
        stopDrag(false);
      }
    });

    contents.on('before-input-event', (event, input) => {
      if (drag) {
        if (isDragCancel(input)) {
          event.preventDefault();
          stopDrag(true); // Escape puts the window back where the drag started
        }
        return;
      }
      const nudge = classifyNudge(input);
      if (!nudge || !movable()) return;
      event.preventDefault();
      const [x, y] = win.getPosition();
      win.setPosition(x + nudge.dx, y + nudge.dy);
    });
  }

  // Losing focus or closing mid-drag would otherwise leave the window glued to
  // the cursor with a timer still running.
  win.on('blur', () => stopDrag(false));
  win.on('closed', () => stopDrag(false));
}

function layout() {
  if (!win || !view) return;
  const [w, h] = win.getContentSize();
  view.setBounds({ x: 0, y: TOOLBAR_H, width: w, height: Math.max(0, h - TOOLBAR_H) });
}

app.whenReady().then(() => {
  if (cfg.borderless) {
    // No chrome of our own: the loaded page supplies its own frame. One frameless
    // window, content loaded straight into it — no toolbar, no BrowserView, no
    // preload injected into the page.
    win = new BrowserWindow({
      width: cfg.width,
      height: cfg.height,
      ...placement,
      frame: false,
      fullscreen: cfg.fullscreen,
      kiosk: cfg.kiosk,
      backgroundColor: '#000',
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    win.loadURL(cfg.load);
    enableWindowMove([win.webContents]);
    if (cli.screenshot) win.webContents.on('did-finish-load', captureThenQuit);
    return;
  }

  win = new BrowserWindow({
    width: cfg.width,
    height: cfg.height,
    ...placement,
    frame: false, // we draw our own Chrome-style chrome
    fullscreen: cfg.fullscreen,
    kiosk: cfg.kiosk,
    backgroundColor: '#dee1e6',
    webPreferences: {
      preload: join(here, 'preload.mjs'),
      contextIsolation: true,
      sandbox: false, // required for an ESM preload
      nodeIntegration: false,
    },
  });
  win.loadFile(join(here, 'toolbar.html'));

  // Real top-level browser view for the page content (no iframe restrictions).
  view = new BrowserView({ webPreferences: { contextIsolation: true } });
  win.setBrowserView(view);
  layout();
  view.webContents.loadURL(cfg.load);

  // Same gestures here as in borderless mode — the toolbar's drag strip only
  // covers the top 84px, and the content view swallows everything below it.
  enableWindowMove([win.webContents, view.webContents]);

  win.on('resize', layout);
  win.on('enter-full-screen', layout);
  win.on('leave-full-screen', layout);

  win.webContents.on('did-finish-load', () => win.webContents.send('config', cfg));

  if (cli.screenshot) view.webContents.on('did-finish-load', captureThenQuit);

  const pushNavState = () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('navstate', {
        canBack: view.webContents.canGoBack(),
        canForward: view.webContents.canGoForward(),
      });
    }
  };
  view.webContents.on('did-navigate', pushNavState);
  view.webContents.on('did-navigate-in-page', pushNavState);
});

// Address bar / nav buttons drive the REAL content view.
ipcMain.on('nav', (_e, action, arg) => {
  if (!view) return;
  const wc = view.webContents;
  if (action === 'back' && wc.canGoBack()) wc.goBack();
  else if (action === 'forward' && wc.canGoForward()) wc.goForward();
  else if (action === 'reload') wc.reload();
  else if (action === 'go' && arg) wc.loadURL(arg);
});

// Fake window controls.
ipcMain.on('win', (_e, action) => {
  if (!win) return;
  if (action === 'close') win.close();
  else if (action === 'min') win.minimize();
  else if (action === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
});

app.on('window-all-closed', () => app.quit());
