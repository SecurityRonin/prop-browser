import { describe, it, expect } from 'vitest';
import { parseCli } from '../src/cli.js';

describe('parseCli', () => {
  const electron = '/usr/local/bin/electron';
  const app = '.';

  it('returns defaults when no extra args are given', () => {
    const cli = parseCli([electron, app]);
    expect(cli).toEqual({
      sceneFile: null,
      screenshot: null,
      borderless: false,
      url: null,
      x: null,
      y: null,
    });
  });

  it('parses --x/--y with following values', () => {
    const cli = parseCli([electron, app, '--x', '120', '--y', '48']);
    expect(cli).toMatchObject({ x: 120, y: 48 });
  });

  it('parses --x=/--y= (equals form)', () => {
    expect(parseCli([electron, app, '--x=0', '--y=0'])).toMatchObject({ x: 0, y: 0 });
  });

  it('accepts negative coordinates (a display left of or above the primary)', () => {
    expect(parseCli([electron, app, '--x', '-1920', '--y=-100'])).toMatchObject({
      x: -1920,
      y: -100,
    });
  });

  it('ignores --x/--y with a non-numeric or missing value', () => {
    expect(parseCli([electron, app, '--x', 'left']).x).toBeNull();
    expect(parseCli([electron, app, '--x']).x).toBeNull();
    expect(parseCli([electron, app, '--x', '--borderless'])).toMatchObject({
      x: null,
      borderless: true,
    });
  });

  it('does not mistake an --x value for a scene file', () => {
    expect(parseCli([electron, app, '--x', '10', 'hero.json']).sceneFile).toBe('hero.json');
  });

  it('parses --borderless', () => {
    expect(parseCli([electron, app, '--borderless']).borderless).toBe(true);
  });

  it('parses --url with a following value', () => {
    expect(parseCli([electron, app, '--url', 'https://x/y?z=1']).url).toBe('https://x/y?z=1');
  });

  it('parses --url=value (equals form)', () => {
    expect(parseCli([electron, app, '--url=https://x/y?z=1']).url).toBe('https://x/y?z=1');
  });

  it('does not treat the --url value as a scene file', () => {
    expect(parseCli([electron, app, '--url', 'https://x/y']).sceneFile).toBeNull();
  });

  it('picks up a positional .json file as the scene', () => {
    const cli = parseCli([electron, app, 'shots/hero.json']);
    expect(cli.sceneFile).toBe('shots/hero.json');
  });

  it('picks up a .propscene file as the scene', () => {
    const cli = parseCli([electron, app, 'demo.propscene']);
    expect(cli.sceneFile).toBe('demo.propscene');
  });

  it('parses --screenshot with an output path', () => {
    const cli = parseCli([electron, app, '--screenshot', 'out.png']);
    expect(cli.screenshot).toBe('out.png');
  });

  it('parses --screenshot=path (equals form)', () => {
    const cli = parseCli([electron, app, '--screenshot=capture.png']);
    expect(cli.screenshot).toBe('capture.png');
  });

  it('defaults screenshot output to screenshot.png when no path follows', () => {
    const cli = parseCli([electron, app, '--screenshot']);
    expect(cli.screenshot).toBe('screenshot.png');
  });

  it('does not mistake --screenshot value for a scene file', () => {
    const cli = parseCli([electron, app, '--screenshot', 'out.png']);
    expect(cli.sceneFile).toBeNull();
  });

  it('parses both scene file and --screenshot together', () => {
    const cli = parseCli([electron, app, 'hero.json', '--screenshot', 'hero.png']);
    expect(cli.sceneFile).toBe('hero.json');
    expect(cli.screenshot).toBe('hero.png');
  });

  it('parses --screenshot before the scene file', () => {
    const cli = parseCli([electron, app, '--screenshot', 'out.png', 'hero.json']);
    expect(cli.sceneFile).toBe('hero.json');
    expect(cli.screenshot).toBe('out.png');
  });

  it('ignores unrecognized flags', () => {
    const cli = parseCli([electron, app, '--verbose', 'scene.json']);
    expect(cli.sceneFile).toBe('scene.json');
  });

  it('does not treat a non-json/propscene positional as a scene file', () => {
    const cli = parseCli([electron, app, 'README.md']);
    expect(cli.sceneFile).toBeNull();
  });
});
