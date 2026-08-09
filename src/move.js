// Moving the prop window when nothing on screen can be grabbed.
//
// The usual Electron answer for a frameless window is `-webkit-app-region: drag`
// in the page's own CSS. Borderless mode cannot use it: the page belongs to
// someone else and editing it would alter the thing being filmed. So the
// gestures below are classified in the MAIN process, from Chromium's
// `before-mouse-event` / `before-input-event` — both of which fire before the
// event reaches the page and can be cancelled, so the page never sees the grab
// and never scrolls on our arrow keys.
//
// Pure and Electron-free so it is unit-testable; electron/main.js does the moving.

/** Fine nudge, in DIP. */
export const NUDGE_STEP = 1;
/** Coarse nudge, in DIP — Shift held. */
export const NUDGE_STEP_COARSE = 10;

// A Map, not an object literal: `input.key` is arbitrary text and must not be
// able to reach Object.prototype ("constructor" would otherwise match).
const ARROWS = new Map([
  ['ArrowLeft', { dx: -1, dy: 0 }],
  ['ArrowRight', { dx: 1, dy: 0 }],
  ['ArrowUp', { dx: 0, dy: -1 }],
  ['ArrowDown', { dx: 0, dy: 1 }],
]);

/**
 * Classify an Electron `before-input-event` input as a window nudge:
 *   - Alt+Arrow      -> one pixel
 *   - Alt+Ctrl+Arrow -> ten pixels
 *   - anything else  -> null (the page keeps the key)
 *
 * Ctrl rather than Shift for the coarse step: Alt+Shift+Arrow never reaches the
 * app on Linux/X11 — measured on Ubuntu 24.04, where the arrow key event simply
 * never arrives because the desktop grabs Alt+Shift as the keyboard-layout
 * chord. Shift is therefore ignored here.
 *
 * @param {{type?: string, key?: string, alt?: boolean, control?: boolean}} input
 * @returns {{dx: number, dy: number}|null} offset in DIP
 */
export function classifyNudge(input) {
  if (!input || input.type !== 'keyDown' || !input.alt) return null;
  const dir = ARROWS.get(input.key);
  if (!dir) return null;
  const step = input.control ? NUDGE_STEP_COARSE : NUDGE_STEP;
  return { dx: dir.dx * step, dy: dir.dy * step };
}

/**
 * True when this mouse event should pick the window up: a right-button press.
 *
 * Not a modifier chord, which is the obvious choice and is not available here.
 * Electron 43 emits `before-mouse-event` (and `input-event`) with no `modifiers`
 * field at all — measured, an Alt+click payload is identical to a plain one, so
 * "Alt+drag" is undetectable on the mouse channel. `modifiers` appears on the
 * MouseInputEvent structure because that type is also the INPUT to
 * webContents.sendInputEvent; being accepted going in is not being populated
 * coming out. `button` is reported reliably, so the button is the discriminator.
 * The left button therefore stays entirely the page's.
 */
export function isDragStart(mouse) {
  return !!mouse && mouse.type === 'mouseDown' && mouse.button === 'right';
}

/** True when this mouse event should put the window down — any release ends it. */
export function isDragEnd(mouse) {
  return !!mouse && mouse.type === 'mouseUp';
}

/** True when this key event should abandon the drag and restore the start position. */
export function isDragCancel(input) {
  return !!input && input.type === 'keyDown' && input.key === 'Escape';
}

/**
 * Vector from the cursor to the window origin at the moment of the grab.
 *
 * Holding it constant for the whole drag keeps the grabbed point under the
 * cursor, which in turn keeps the cursor inside the window — so the mouse-up
 * that ends the drag is always delivered to us, even though the page never
 * received the mouse-down and so never took pointer capture.
 */
export function grabOffset(windowPos, cursor) {
  return { dx: windowPos.x - cursor.x, dy: windowPos.y - cursor.y };
}

/** Where the window origin belongs for a given cursor position, in DIP. */
export function dragTarget(offset, cursor) {
  return { x: cursor.x + offset.dx, y: cursor.y + offset.dy };
}
