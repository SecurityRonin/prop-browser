import { describe, it, expect } from 'vitest';
import { parseScene } from '../src/scene.js';

describe('parseScene', () => {
  it('returns a normalized scene from a minimal valid object', () => {
    const scene = parseScene({ loadUrl: 'http://localhost:3000' });
    expect(scene.loadUrl).toBe('http://localhost:3000');
  });

  it('fills omitted fields with undefined (caller merges with config defaults)', () => {
    const scene = parseScene({});
    expect(scene.loadUrl).toBeUndefined();
    expect(scene.displayUrl).toBeUndefined();
    expect(scene.title).toBeUndefined();
    expect(scene.favicon).toBeUndefined();
    expect(scene.secure).toBeUndefined();
    expect(scene.width).toBeUndefined();
    expect(scene.height).toBeUndefined();
    expect(scene.fullscreen).toBeUndefined();
    expect(scene.kiosk).toBeUndefined();
    expect(scene.x).toBeUndefined();
    expect(scene.y).toBeUndefined();
  });

  it('passes through all recognized fields', () => {
    const input = {
      loadUrl: 'http://localhost:8234/forum.html',
      displayUrl: 'https://www.peanutforum.com/thread/48213',
      title: 'kidkit727',
      favicon: '🌰',
      secure: false,
      width: 1920,
      height: 1080,
      fullscreen: true,
      kiosk: false,
      x: 120,
      y: 48,
    };
    const scene = parseScene(input);
    expect(scene).toEqual(input);
  });

  it('accepts zero and negative window coordinates, unlike width/height', () => {
    expect(parseScene({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(parseScene({ x: -1920, y: -100 })).toEqual({ x: -1920, y: -100 });
  });

  it('rejects x/y that are not integers', () => {
    expect(() => parseScene({ x: 3.5 })).toThrow(/x/);
    expect(() => parseScene({ x: 'left' })).toThrow(/x/);
    expect(() => parseScene({ y: null })).toThrow(/y/);
  });

  it('strips unrecognized fields', () => {
    const scene = parseScene({ loadUrl: 'http://x', bogus: 42, __proto: 'bad' });
    expect(scene.loadUrl).toBe('http://x');
    expect('bogus' in scene).toBe(false);
    expect('__proto' in scene).toBe(false);
  });

  it('throws on non-object input', () => {
    expect(() => parseScene(null)).toThrow();
    expect(() => parseScene('string')).toThrow();
    expect(() => parseScene(42)).toThrow();
    expect(() => parseScene(undefined)).toThrow();
  });

  it('throws on an array', () => {
    expect(() => parseScene([1, 2])).toThrow();
  });

  it('rejects loadUrl that is not a string', () => {
    expect(() => parseScene({ loadUrl: 123 })).toThrow(/loadUrl/);
  });

  it('rejects displayUrl that is not a string', () => {
    expect(() => parseScene({ displayUrl: true })).toThrow(/displayUrl/);
  });

  it('rejects title that is not a string', () => {
    expect(() => parseScene({ title: [] })).toThrow(/title/);
  });

  it('rejects favicon that is not a string', () => {
    expect(() => parseScene({ favicon: {} })).toThrow(/favicon/);
  });

  it('rejects secure that is not a boolean', () => {
    expect(() => parseScene({ secure: 'yes' })).toThrow(/secure/);
  });

  it('rejects width that is not a positive integer', () => {
    expect(() => parseScene({ width: -1 })).toThrow(/width/);
    expect(() => parseScene({ width: 0 })).toThrow(/width/);
    expect(() => parseScene({ width: 3.5 })).toThrow(/width/);
    expect(() => parseScene({ width: 'big' })).toThrow(/width/);
  });

  it('rejects height that is not a positive integer', () => {
    expect(() => parseScene({ height: -10 })).toThrow(/height/);
  });

  it('rejects fullscreen that is not a boolean', () => {
    expect(() => parseScene({ fullscreen: 1 })).toThrow(/fullscreen/);
  });

  it('rejects kiosk that is not a boolean', () => {
    expect(() => parseScene({ kiosk: 'true' })).toThrow(/kiosk/);
  });
});
