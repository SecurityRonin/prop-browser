import { describe, it, expect } from 'vitest';
import {
  NUDGE_STEP,
  NUDGE_STEP_COARSE,
  classifyNudge,
  isDragStart,
  isDragEnd,
  isDragCancel,
  grabOffset,
  dragTarget,
} from '../src/move.js';

describe('classifyNudge', () => {
  it('Alt+Arrow nudges one pixel in that direction', () => {
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowLeft', alt: true })).toEqual({
      dx: -NUDGE_STEP,
      dy: 0,
    });
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowRight', alt: true })).toEqual({
      dx: NUDGE_STEP,
      dy: 0,
    });
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowUp', alt: true })).toEqual({
      dx: 0,
      dy: -NUDGE_STEP,
    });
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowDown', alt: true })).toEqual({
      dx: 0,
      dy: NUDGE_STEP,
    });
  });

  it('Alt+Shift+Arrow nudges by the coarse step', () => {
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowRight', alt: true, shift: true })).toEqual({
      dx: NUDGE_STEP_COARSE,
      dy: 0,
    });
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowUp', alt: true, shift: true })).toEqual({
      dx: 0,
      dy: -NUDGE_STEP_COARSE,
    });
  });

  it('the coarse step is bigger than the fine one', () => {
    expect(NUDGE_STEP_COARSE).toBeGreaterThan(NUDGE_STEP);
  });

  it('ignores an arrow without Alt, so the page keeps its own arrow keys', () => {
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowLeft' })).toBeNull();
    expect(classifyNudge({ type: 'keyDown', key: 'ArrowLeft', alt: false })).toBeNull();
  });

  it('ignores keyUp, so one press moves the window once', () => {
    expect(classifyNudge({ type: 'keyUp', key: 'ArrowLeft', alt: true })).toBeNull();
  });

  it('ignores any non-arrow key', () => {
    expect(classifyNudge({ type: 'keyDown', key: 'a', alt: true })).toBeNull();
  });

  it('ignores a missing event', () => {
    expect(classifyNudge(undefined)).toBeNull();
    expect(classifyNudge(null)).toBeNull();
  });
});

describe('isDragStart', () => {
  it('is an Alt + left mouse-down', () => {
    expect(isDragStart({ type: 'mouseDown', button: 'left', modifiers: ['alt'] })).toBe(true);
  });

  it('tolerates other modifiers riding along', () => {
    expect(
      isDragStart({ type: 'mouseDown', button: 'left', modifiers: ['shift', 'alt'] }),
    ).toBe(true);
  });

  it('is not a plain left mouse-down, so the page keeps its own clicks', () => {
    expect(isDragStart({ type: 'mouseDown', button: 'left', modifiers: [] })).toBe(false);
  });

  it('is not a right or middle button', () => {
    expect(isDragStart({ type: 'mouseDown', button: 'right', modifiers: ['alt'] })).toBe(false);
    expect(isDragStart({ type: 'mouseDown', button: 'middle', modifiers: ['alt'] })).toBe(false);
  });

  it('is not a move or an up', () => {
    expect(isDragStart({ type: 'mouseMove', button: 'left', modifiers: ['alt'] })).toBe(false);
    expect(isDragStart({ type: 'mouseUp', button: 'left', modifiers: ['alt'] })).toBe(false);
  });

  it('survives a missing event or missing modifiers', () => {
    expect(isDragStart(undefined)).toBe(false);
    expect(isDragStart({ type: 'mouseDown', button: 'left' })).toBe(false);
  });
});

describe('isDragEnd', () => {
  it('is any mouse-up, whatever the modifiers were by then', () => {
    expect(isDragEnd({ type: 'mouseUp' })).toBe(true);
  });

  it('is not a down or a move', () => {
    expect(isDragEnd({ type: 'mouseDown' })).toBe(false);
    expect(isDragEnd({ type: 'mouseMove' })).toBe(false);
  });

  it('survives a missing event', () => {
    expect(isDragEnd(undefined)).toBe(false);
  });
});

describe('isDragCancel', () => {
  it('is Escape pressed', () => {
    expect(isDragCancel({ type: 'keyDown', key: 'Escape' })).toBe(true);
  });

  it('is not Escape released, nor any other key', () => {
    expect(isDragCancel({ type: 'keyUp', key: 'Escape' })).toBe(false);
    expect(isDragCancel({ type: 'keyDown', key: 'a' })).toBe(false);
  });

  it('survives a missing event', () => {
    expect(isDragCancel(undefined)).toBe(false);
  });
});

describe('grabOffset / dragTarget', () => {
  it('keeps the grabbed point under the cursor for the whole drag', () => {
    const windowPos = { x: 100, y: 200 };
    const grab = { x: 150, y: 260 }; // cursor 50 right, 60 down of the window origin
    const offset = grabOffset(windowPos, grab);
    expect(offset).toEqual({ dx: -50, dy: -60 });

    // Cursor unmoved -> window unmoved.
    expect(dragTarget(offset, grab)).toEqual(windowPos);

    // Cursor moves 30 right, 10 up -> window follows exactly.
    expect(dragTarget(offset, { x: 180, y: 250 })).toEqual({ x: 130, y: 190 });
  });

  it('handles negative screen coordinates (a display left of or above the primary)', () => {
    const offset = grabOffset({ x: -1920, y: -100 }, { x: -1900, y: -80 });
    expect(dragTarget(offset, { x: -1900, y: -80 })).toEqual({ x: -1920, y: -100 });
  });
});
