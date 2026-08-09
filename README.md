# prop-window

[![CI](https://github.com/SecurityRonin/prop-window/actions/workflows/ci.yml/badge.svg)](https://github.com/SecurityRonin/prop-window/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/SecurityRonin/prop-window/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-h4x0r-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/h4x0r)

**A film prop window: put any URL on camera, no matter where the page comes from.**

Real Chromium (Electron), with a Chrome-style chrome we draw ourselves — so the address
bar shows whatever you tell it, fully decoupled from the page actually loaded. Point it at
a local mock or a live site; the bar reads `https://www.yourfilm.example` with a padlock.

```bash
git clone https://github.com/SecurityRonin/prop-window
cd prop-window && npm install

# Load any content, show any URL on camera:
DISPLAY_URL="https://www.peanutforum.com/thread/48213" \
LOAD_URL="http://localhost:8234/forum.html" \
FULLSCREEN=1 npm start
```

The window is a real browser rendering `LOAD_URL`; the toolbar shows `DISPLAY_URL`. In
fullscreen there's no real browser chrome on screen — only the one we draw.

### macOS: one-time trust step

macOS XProtect currently false-positives on unsigned Electron dev binaries (the same alert
that hit ChatGPT, Cursor, and Codex in 2026) and moves them to Trash. To run your own local
build, ad-hoc sign it once after install:

```bash
npm run mac:trust   # clears the download-quarantine flag and ad-hoc signs the local build
npm start
```

This only affects this project's local copy — it changes no system settings. Signed,
notarized distribution builds are deferred (see CHANGELOG).

## Why not an extension or a Chromium fork?

- **An extension can't do it.** Browsers forbid extensions from writing an arbitrary value
  into the omnibox — the address bar always reflects the page's true origin. That's an
  anti-phishing rule with no override.
- **A Chromium source fork is the wrong tool.** Patching the omnibox means editing
  security-critical navigation C++, a ~100 GB tree, and multi-hour builds.
- **Electron _is_ Chrome.** Same engine, packaged so we own the window chrome. The content
  is a real top-level `BrowserView` (not an `<iframe>`), so it loads **any** site — external
  ones included — with no `X-Frame-Options` limits, while the address bar stays under our
  control.

## Configure per shot (environment variables)

| Var                | Meaning                                        | Default                   |
| ------------------ | ---------------------------------------------- | ------------------------- |
| `LOAD_URL`         | content actually fetched                       | bundled welcome page      |
| `DISPLAY_URL`      | URL shown in the address bar (the spoof)       | `https://www.example.com` |
| `TITLE`            | tab title                                      | `New Tab`                 |
| `FAVICON`          | emoji, or an image URL                         | `🌐`                      |
| `SECURE`           | `0` → "Not secure"; else padlock               | padlock                   |
| `FULLSCREEN`       | `1` → fullscreen (only our chrome on camera)   | off                       |
| `KIOSK`            | `1` → kiosk (no escape chrome)                 | off                       |
| `BORDERLESS`       | `1` → drop our chrome; page draws its frame    | off                       |
| `WIDTH` / `HEIGHT` | windowed size                                  | `1440` × `900`            |
| `X` / `Y`          | windowed position; signed, set both or neither | OS default                |

## Borderless mode (the page draws its own frame)

By default the app draws a Chrome-style toolbar and fake address bar. **Borderless**
drops all of that — no toolbar, no BrowserView — and loads the page straight into a
single frameless window, so the _page_ supplies the frame. Use it when the content
already looks like a native window and a second border would give the prop away — e.g.
the [Kali window mockup](https://hacker-film-mockup.vercel.app/mockups/kali-window.html),
which draws a Kali 2026.2 window decoration around any inner mockup.

```bash
npm start -- --borderless \
  --url "https://hacker-film-mockup.vercel.app/mockups/kali-window.html?app=osint-nexus-graph.html&title=NEXUS%20OSINT"
```

CLI flags (override env/scene):

| Flag                | Meaning                                       |
| ------------------- | --------------------------------------------- |
| `--borderless`      | drop our chrome (same as `BORDERLESS=1`)      |
| `--url <url>`       | page to load (same as `LOAD_URL`)             |
| `--x <n>` `--y <n>` | window position (same as `X` / `Y`)           |
| `--screenshot <p>`  | render, capture the window to `<p>.png`, quit |

A packaged Windows `.exe` launches the same way — pass the flags in the shortcut's
_Target_:

```
prop-window.exe --borderless --url "https://…/kali-window.html?app=osint-nexus-graph.html&title=NEXUS%20OSINT"
```

> **Behind auth?** If the live URL sits behind Vercel deployment protection (Basic
> auth), the operator gets a login prompt instead of the mockup. Make the specific
> mockup path public, disable protection for that project, or append a
> protection-bypass token — the borderless window has no chrome to type credentials
> into cleanly on camera.

## On-set controls

- **Address bar is the spoof control.** Click it and type any URL.
  - **Enter** → set the _displayed_ URL (content unchanged) — the spoof.
  - **Shift+Enter** → actually navigate the content to the typed URL.
- **Back / Forward / Reload** drive the real content view.
- The top strip is a window-drag handle when not fullscreen.

### Moving the window

Borderless mode has no chrome of ours to grab and the page is someone else's, so the
window is moved from outside the page entirely — the gestures are read before Chromium
hands the event to the page, and then cancelled, so the page never sees them and is
never altered. They work in both modes, and do nothing in fullscreen or kiosk.

| Gesture                | Effect                              |
| ---------------------- | ----------------------------------- |
| **Right-drag**         | pick the window up anywhere on it   |
| **Escape** mid-drag    | drop it back where the drag started |
| **Alt + arrow**        | nudge 1 px — for final framing      |
| **Alt + Ctrl + arrow** | nudge 10 px                         |

The _right_ button, not a modifier chord, because Electron reports no modifier state on
mouse events — an Alt+click is indistinguishable from a plain one. The left button
therefore stays entirely the page's, and the right-press is swallowed before the page
sees it, so no context menu appears on camera.

For a position that survives a reshoot, don't drag — set it: `X` / `Y`, `--x` / `--y`,
or `x` / `y` in a scene file. Coordinates are signed, so a display left of or above the
primary one is reachable with negatives.

**On Linux**, run under X11 — pass `--ozone-platform=x11` if your desktop is Wayland,
where Electron cannot position or move a window at all. Window managers also place
windows themselves, so the requested `x`/`y` is re-applied once the window appears
rather than at creation.

```bash
npm start -- --borderless --url "https://…/kali-window.html" --x 320 --y 180
```

## Trust but verify

- **Tested logic ships.** The URL parsing, favicon detection, config, and Enter-key
  semantics live in `src/` under **100% line/branch/function coverage** (vitest), and the
  preload exposes those _same_ functions to the renderer — no untested copy in the HTML.
- **Humble Object shell.** The Electron layer (`electron/*`) carries no decisions, so it
  stays a thin, reviewable shell over Chromium.

## What this is — and isn't

A **stage prop**: a picture of a browser, for a camera. It performs no network deception —
the address bar is a widget we draw, so there is nothing intercepted or forged on the wire.
Use it for filming and demos.

---

[Privacy Policy](https://securityronin.github.io/prop-window/privacy/) · [Terms of Service](https://securityronin.github.io/prop-window/terms/) · © 2026 Security Ronin Ltd
