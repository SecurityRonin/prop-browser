# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Deferred

- **Homebrew Cask** auto-publish to a personal tap (recipe documented; tap repo pending).

## [0.3.0] - 2026-08-09

### Added

- **The borderless window can be moved.** It loads a page we don't own into a frameless
  window and none of our own chrome, so there was no `-webkit-app-region: drag` handle
  anywhere on it and nothing set `x`/`y` — the window was stuck wherever Electron first
  put it. Three ways out, all working in both modes and inert in fullscreen/kiosk:
  - **Right-drag** anywhere picks the window up; **Escape** mid-drag returns it to where
    the drag began.
  - **Alt + arrow** nudges 1 px, **Alt + Shift + arrow** 10 px, for final framing.
  - **`X` / `Y`, `--x` / `--y`, or `x` / `y` in a scene file** place it outright —
    signed, so displays left of or above the primary are reachable. The pair is
    all-or-nothing; a lone coordinate falls back to the OS's placement.

  The gestures are classified in the main process from Chromium's `before-mouse-event`
  and `before-input-event` (both pre-dispatch and cancellable, Electron 37+ for the
  former) and then cancelled, so the loaded page never receives the grab, never scrolls
  on our arrow keys, and is not modified — which is what makes this safe on a third-party
  page. The decisions live in `src/move.js` under the 100% coverage gate; `electron/main.js`
  only wires them.

  The drag is the **right** button rather than the expected Alt+drag because Electron 43
  emits no `modifiers` on `before-mouse-event` or `input-event` — measured, an Alt+click
  payload is identical to a plain one, so a modifier chord is undetectable on the mouse
  channel. (`modifiers` is on the `MouseInputEvent` structure because that type is also
  the _input_ to `webContents.sendInputEvent`.) `button` is reported reliably, so it is
  the discriminator, and the left button stays entirely the page's.

  Verified end to end on **macOS and Windows** by synthesizing real input and reading the
  resulting window position back from the OS — on macOS, Quartz `CGEvent` into the HID tap
  measured by `CGWindowListCopyWindowInfo`; on Windows 11 ARM64 (build 26200, Electron
  win32-arm64), `mouse_event`/`keybd_event` measured by
  `DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)`. Both platforms pass all of:
  placement honours `--x`/`--y`, a plain left-drag does _not_ move the window (the negative
  control), a right-drag moves it by exactly the cursor delta, the window stops following
  after mouse-up, and the two nudges move 1 px and 10 px.

  Two Windows measurement notes, neither a defect in this change: `GetWindowRect` reports
  the window ~8 px wider on each side than it looks, because it counts the invisible
  resize border — `DWMWA_EXTENDED_FRAME_BOUNDS` gives the visible frame. And Windows
  clamps a window taller than the monitor work area, so an oversized `HEIGHT` comes back
  smaller than requested.

## [0.2.2] - 2026-08-05

### Added

- **Inner app executable is now Authenticode-signed**, not just the installer. The Windows build
  is two-phase: sign the unpacked `prop-window.exe`, then pack the NSIS installer and sign that
  too — so the installed binary itself shows verified publisher Security Ronin Ltd.

### Changed

- Consolidated project ownership under **SecurityRonin**: README badges/links, docs, mkdocs, the
  Homebrew-tap references, the copyright (© Security Ronin Ltd), and the electron-builder appId
  (`dev.h4x0r.prop-window` → `dev.securityronin.prop-window`) now point to SecurityRonin. The
  Sponsor badge stays `h4x0r` (personal). Note: the appId change means a fresh install rather than
  an in-place upgrade from ≤ 0.2.1.

## [0.2.1] - 2026-08-04

### Added

- **Windows Authenticode signing** via Azure Trusted Signing under verified publisher
  **Security Ronin Ltd** — keyless through GitHub OIDC (no cert file, no client secret). The
  released `prop-window.Setup.<ver>.exe` installer is signed, so it clears SmartScreen's
  unknown-publisher block. (The app's inner exe, packed by electron-builder, is not yet signed.)

## [0.2.0] - 2026-08-04

### Added

- **Borderless mode** (`--borderless` / `BORDERLESS=1`): drops our own chrome and loads the page
  full-window so it can draw its own frame — e.g. the Kali window mockup's native-looking border,
  with no second border to give the prop away.
- `--url` and `--screenshot` CLI flags (override the loaded page; render-capture-quit).
- Scene files (JSON / `.propscene`) for per-shot config, parsed by `parseScene`; scene fields
  override injected defaults, environment variables still win over scene fields.

### Changed

- **Renamed `prop-browser` → `prop-window`** to reflect that the tool now frames any prop window
  (framed browser _or_ borderless), not just a fake browser.

## [0.1.0] - 2026-08-02

### Added

- Initial prop browser: real Chromium (Electron) with a self-drawn Chrome chrome whose address
  bar is decoupled from the loaded page.
- Pure `src/` logic (URL parsing, favicon detection, config, Enter-key semantics) under 100%
  test coverage.
- Environment-variable configuration (`LOAD_URL`, `DISPLAY_URL`, `TITLE`, `FAVICON`, `SECURE`,
  `FULLSCREEN`, `KIOSK`, `WIDTH`, `HEIGHT`).
- CI (lint + format + 100% coverage gate), MkDocs → Pages, and a tag-driven multi-OS release
  workflow (electron-builder).
- **macOS signing + notarization** wired (electron-builder, Developer-ID + App Store Connect
  API notarization + staple), gated on the `MACOS_*` secrets — ships unsigned until they exist.
  See `docs/macos-signing.md`.
