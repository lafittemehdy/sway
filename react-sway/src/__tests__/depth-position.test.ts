/** Specifies depth periodicity, seam continuity, camera clearance, and bounded geometry inputs. */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEPTH_PERSPECTIVE,
  DEFAULT_DEPTH_SPACING,
  getDepthItemState,
  normalizeDepthLength,
} from '../depth-position';

describe('periodic depth geometry', () => {
  it('keeps every plane behind the camera with bounded opacity in either direction', () => {
    for (const count of [1, 2, 8, 30]) {
      for (const perspective of [1, 500, DEFAULT_DEPTH_PERSPECTIVE]) {
        for (const spacing of [1, 220, DEFAULT_DEPTH_SPACING]) {
          for (let sample = -40; sample <= 40; sample++) {
            const position = sample * spacing * 0.37;
            for (let index = 0; index < count; index++) {
              const state = getDepthItemState(position, index, count, perspective, spacing);
              expect(Number.isFinite(state.z)).toBe(true);
              expect(state.z).toBeLessThanOrEqual(perspective * 0.7);
              expect(state.opacity).toBeGreaterThanOrEqual(0);
              expect(state.opacity).toBeLessThanOrEqual(1);
              const recycled = getDepthItemState(position + count * spacing, index, count, perspective, spacing);
              expect(recycled.z).toBeCloseTo(state.z, 7);
              expect(recycled.opacity).toBeCloseTo(state.opacity, 7);
            }
          }
        }
      }
    }
  });

  it('hides both sides of a recycling seam before the spatial discontinuity', () => {
    for (const count of [1, 2, 8]) {
      expect(getDepthItemState(0, 0, count).opacity).toBe(0);
      expect(getDepthItemState(-0.001, 0, count).opacity).toBeLessThan(0.000001);
      expect(getDepthItemState(0.001, 0, count).opacity).toBeLessThan(0.000001);
    }
    expect(getDepthItemState(100, 0, 0)).toEqual({ opacity: 0, z: 0 });
  });

  it('normalizes untrusted pixel lengths before computing periods or perspective', () => {
    for (const invalid of [Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, -1, 0]) {
      expect(normalizeDepthLength(invalid, 420)).toBe(420);
    }
    expect(normalizeDepthLength(Number.MIN_VALUE, 420)).toBe(1);
    expect(normalizeDepthLength(Number.MAX_VALUE, 420)).toBe(Number.MAX_SAFE_INTEGER);
    expect(normalizeDepthLength(321.5, 420)).toBe(321.5);
    const spacing = normalizeDepthLength(Number.MAX_VALUE, 420);
    const state = getDepthItemState(-1e30, 7, 8, 800, spacing);
    expect(Number.isFinite(state.z)).toBe(true);
    expect(Number.isFinite(state.opacity)).toBe(true);
  });
});
