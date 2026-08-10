import { describe, it, expect } from 'vitest';
import { parseCli } from '../src/cli.js';

// parseCli takes the USER-supplied CLI arguments — the executable / app-path
// prefix (which varies between dev-mode and packaged Electron) is stripped by
// electron/main.js before it's called. See the comment there for the argv
// shape discrimination via `process.defaultApp`.

describe('parseCli', () => {
  it('returns defaults when no args are given', () => {
    expect(parseCli([])).toEqual({
      sceneFile: null,
      screenshot: null,
      borderless: false,
      url: null,
      x: null,
      y: null,
    });
  });

  it('parses --borderless', () => {
    expect(parseCli(['--borderless']).borderless).toBe(true);
  });

  it('parses --url with a following value', () => {
    expect(parseCli(['--url', 'https://x/y?z=1']).url).toBe('https://x/y?z=1');
  });

  it('parses --url=value (equals form)', () => {
    expect(parseCli(['--url=https://x/y?z=1']).url).toBe('https://x/y?z=1');
  });

  it('does not treat the --url value as a scene file', () => {
    expect(parseCli(['--url', 'https://x/y']).sceneFile).toBeNull();
  });

  it('picks up a positional .json file as the scene', () => {
    expect(parseCli(['shots/hero.json']).sceneFile).toBe('shots/hero.json');
  });

  it('picks up a .propscene file as the scene', () => {
    expect(parseCli(['demo.propscene']).sceneFile).toBe('demo.propscene');
  });

  it('parses --screenshot with an output path', () => {
    expect(parseCli(['--screenshot', 'out.png']).screenshot).toBe('out.png');
  });

  it('parses --screenshot=path (equals form)', () => {
    expect(parseCli(['--screenshot=capture.png']).screenshot).toBe('capture.png');
  });

  it('defaults screenshot output to screenshot.png when no path follows', () => {
    expect(parseCli(['--screenshot']).screenshot).toBe('screenshot.png');
  });

  it('does not mistake --screenshot value for a scene file', () => {
    expect(parseCli(['--screenshot', 'out.png']).sceneFile).toBeNull();
  });

  it('parses both scene file and --screenshot together', () => {
    const cli = parseCli(['hero.json', '--screenshot', 'hero.png']);
    expect(cli.sceneFile).toBe('hero.json');
    expect(cli.screenshot).toBe('hero.png');
  });

  it('parses --screenshot before the scene file', () => {
    const cli = parseCli(['--screenshot', 'out.png', 'hero.json']);
    expect(cli.sceneFile).toBe('hero.json');
    expect(cli.screenshot).toBe('out.png');
  });

  it('ignores unrecognized flags', () => {
    expect(parseCli(['--verbose', 'scene.json']).sceneFile).toBe('scene.json');
  });

  it('does not treat a non-json/propscene positional as a scene file', () => {
    expect(parseCli(['README.md']).sceneFile).toBeNull();
  });

  it('parses --x/--y with following values', () => {
    expect(parseCli(['--x', '120', '--y', '48'])).toMatchObject({ x: 120, y: 48 });
  });

  it('parses --x=/--y= (equals form)', () => {
    expect(parseCli(['--x=0', '--y=0'])).toMatchObject({ x: 0, y: 0 });
  });

  it('accepts negative coordinates (a display left of or above the primary)', () => {
    expect(parseCli(['--x', '-1920', '--y=-100'])).toMatchObject({ x: -1920, y: -100 });
  });

  it('ignores --x/--y with a non-numeric or missing value', () => {
    expect(parseCli(['--x', 'left']).x).toBeNull();
    expect(parseCli(['--x']).x).toBeNull();
    expect(parseCli(['--x', '--borderless'])).toMatchObject({ x: null, borderless: true });
  });

  it('does not mistake an --x value for a scene file', () => {
    expect(parseCli(['--x', '10', 'hero.json']).sceneFile).toBe('hero.json');
  });

  // -- Regression: the take-day command that hit the packaged-argv bug --------
  // Before the fix, electron/main.js passed process.argv straight to parseCli
  // and parseCli did an unconditional argv.slice(2). In packaged Electron
  // (argv = [exe, ...userArgs]) that dropped the first user flag on the floor.
  // Now main.js pre-strips the exe entry, so parseCli sees only user args and
  // both flags land. This test locks the shape parseCli must accept.
  it('parses --borderless + --url together (the take-day command)', () => {
    const cli = parseCli(['--borderless', '--url', 'https://x/y?z=1']);
    expect(cli.borderless).toBe(true);
    expect(cli.url).toBe('https://x/y?z=1');
  });
});
