import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/config.js';

describe('parseConfig', () => {
  it('applies built-in defaults for an empty environment', () => {
    expect(parseConfig({}, {})).toEqual({
      load: '',
      display: 'https://www.example.com',
      title: 'New Tab',
      favicon: '🌐',
      secure: true,
      fullscreen: false,
      kiosk: false,
      borderless: false,
      width: 1440,
      height: 900,
      x: null,
      y: null,
    });
  });

  it('reads an explicit window position from the environment', () => {
    expect(parseConfig({ X: '120', Y: '48' })).toMatchObject({ x: 120, y: 48 });
  });

  it('accepts zero and negative coordinates (unlike width/height)', () => {
    expect(parseConfig({ X: '0', Y: '0' })).toMatchObject({ x: 0, y: 0 });
    expect(parseConfig({ X: '-1920', Y: '-100' })).toMatchObject({ x: -1920, y: -100 });
  });

  it('falls back to unpositioned when X/Y are not numbers', () => {
    expect(parseConfig({ X: 'left', Y: '' })).toMatchObject({ x: null, y: null });
  });

  it('takes the window position from a scene, with the environment winning', () => {
    expect(parseConfig({}, {}, { x: 10, y: 20 })).toMatchObject({ x: 10, y: 20 });
    expect(parseConfig({ X: '99' }, {}, { x: 10, y: 20 })).toMatchObject({ x: 99, y: 20 });
  });

  it('works with no arguments at all', () => {
    expect(parseConfig().display).toBe('https://www.example.com');
  });

  it('lets injected defaults override the built-ins', () => {
    const cfg = parseConfig(
      {},
      {
        load: 'file:///forum.html',
        display: 'https://d',
        title: 'T',
        favicon: '🥜',
        width: 800,
        height: 600,
      },
    );
    expect(cfg).toMatchObject({
      load: 'file:///forum.html',
      display: 'https://d',
      title: 'T',
      favicon: '🥜',
      width: 800,
      height: 600,
    });
  });

  it('lets environment variables override everything', () => {
    const cfg = parseConfig({
      LOAD_URL: 'http://localhost:8234/x.html',
      DISPLAY_URL: 'https://www.peanutforum.com/thread/48213',
      TITLE: 'kidkit727',
      FAVICON: '🌰',
    });
    expect(cfg).toMatchObject({
      load: 'http://localhost:8234/x.html',
      display: 'https://www.peanutforum.com/thread/48213',
      title: 'kidkit727',
      favicon: '🌰',
    });
  });

  describe('secure', () => {
    it('defaults to true', () => {
      expect(parseConfig({}).secure).toBe(true);
    });
    it('is false only for the literal "0"', () => {
      expect(parseConfig({ SECURE: '0' }).secure).toBe(false);
    });
    it('is true for "1"', () => {
      expect(parseConfig({ SECURE: '1' }).secure).toBe(true);
    });
    it('is true for any other value', () => {
      expect(parseConfig({ SECURE: 'yes' }).secure).toBe(true);
    });
  });

  describe('fullscreen / kiosk', () => {
    it('FULLSCREEN=1 sets fullscreen but not kiosk', () => {
      const c = parseConfig({ FULLSCREEN: '1' });
      expect(c.fullscreen).toBe(true);
      expect(c.kiosk).toBe(false);
    });
    it('KIOSK=1 implies fullscreen and kiosk', () => {
      const c = parseConfig({ KIOSK: '1' });
      expect(c.fullscreen).toBe(true);
      expect(c.kiosk).toBe(true);
    });
    it('neither set stays windowed', () => {
      const c = parseConfig({});
      expect(c.fullscreen).toBe(false);
      expect(c.kiosk).toBe(false);
    });
    it('FULLSCREEN=0 is not fullscreen', () => {
      expect(parseConfig({ FULLSCREEN: '0' }).fullscreen).toBe(false);
    });
  });

  describe('borderless', () => {
    it('defaults to false', () => {
      expect(parseConfig({}).borderless).toBe(false);
    });
    it('is true only for BORDERLESS=1', () => {
      expect(parseConfig({ BORDERLESS: '1' }).borderless).toBe(true);
      expect(parseConfig({ BORDERLESS: '0' }).borderless).toBe(false);
    });
    it('takes borderless from the scene', () => {
      expect(parseConfig({}, {}, { borderless: true }).borderless).toBe(true);
    });
    it('env overrides the scene', () => {
      expect(parseConfig({ BORDERLESS: '0' }, {}, { borderless: true }).borderless).toBe(false);
    });
  });

  describe('scene overrides', () => {
    it('scene fields override injected defaults', () => {
      const scene = {
        loadUrl: 'http://mock:3000',
        displayUrl: 'https://brand.com',
        title: 'Brand',
      };
      const cfg = parseConfig({}, {}, scene);
      expect(cfg.load).toBe('http://mock:3000');
      expect(cfg.display).toBe('https://brand.com');
      expect(cfg.title).toBe('Brand');
    });

    it('env vars still override scene fields', () => {
      const scene = { displayUrl: 'https://scene.com' };
      const cfg = parseConfig({ DISPLAY_URL: 'https://env.com' }, {}, scene);
      expect(cfg.display).toBe('https://env.com');
    });

    it('scene fields not provided fall through to defaults', () => {
      const scene = { title: 'Only Title' };
      const cfg = parseConfig({}, {}, scene);
      expect(cfg.display).toBe('https://www.example.com');
      expect(cfg.title).toBe('Only Title');
    });

    it('scene secure=false overrides the default true', () => {
      const cfg = parseConfig({}, {}, { secure: false });
      expect(cfg.secure).toBe(false);
    });

    it('scene fullscreen/kiosk booleans are respected', () => {
      const cfg = parseConfig({}, {}, { fullscreen: true, kiosk: false });
      expect(cfg.fullscreen).toBe(true);
      expect(cfg.kiosk).toBe(false);
    });

    it('scene width/height override defaults', () => {
      const cfg = parseConfig({}, {}, { width: 1920, height: 1080 });
      expect(cfg.width).toBe(1920);
      expect(cfg.height).toBe(1080);
    });

    it('works with no scene (backwards compatible)', () => {
      const cfg = parseConfig({}, {});
      expect(cfg.display).toBe('https://www.example.com');
    });

    it('tolerates an explicit null scene', () => {
      expect(parseConfig({}, {}, null).display).toBe('https://www.example.com');
    });
  });

  describe('width / height', () => {
    it('parses valid integers', () => {
      const c = parseConfig({ WIDTH: '1280', HEIGHT: '720' });
      expect(c.width).toBe(1280);
      expect(c.height).toBe(720);
    });
    it('falls back for non-numeric input', () => {
      expect(parseConfig({ WIDTH: 'abc' }).width).toBe(1440);
    });
    it('falls back for a non-positive value', () => {
      expect(parseConfig({ WIDTH: '-5' }).width).toBe(1440);
      expect(parseConfig({ HEIGHT: '0' }).height).toBe(900);
    });
    it('honours an injected default dimension on fallback', () => {
      expect(parseConfig({ WIDTH: 'x' }, { width: 1024 }).width).toBe(1024);
    });
  });
});
