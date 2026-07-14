/**
 * Specifies the spatial edge-depth to signed Sway velocity transformation.
 */
import { describe, expect, it } from 'vitest';

import {
  getEdgeHoverIntensity,
  getEdgeHoverVelocityScale,
} from '../edge-hover-velocity';

const VISIBLE_HORIZONTAL_INTERVAL = {
  end: 500,
  size: 400,
  start: 100,
};

describe('edge-hover velocity policy', () => {
  it('keeps accelerating beyond the leading edge before reaching its cap', () => {
    expect(getEdgeHoverIntensity(200, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0);
    expect(getEdgeHoverIntensity(175, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(0.125);
    expect(getEdgeHoverIntensity(150, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(0.25);
    expect(getEdgeHoverIntensity(125, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(0.375);
    expect(getEdgeHoverIntensity(100, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0.5);
    expect(getEdgeHoverIntensity(50, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0.75);
    expect(getEdgeHoverIntensity(0, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(1);
  });

  it('mirrors the same beyond-edge ramp and cap at the trailing edge', () => {
    expect(getEdgeHoverIntensity(400, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0);
    expect(getEdgeHoverIntensity(425, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(-0.125);
    expect(getEdgeHoverIntensity(450, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(-0.25);
    expect(getEdgeHoverIntensity(475, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBeCloseTo(-0.375);
    expect(getEdgeHoverIntensity(500, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(-0.5);
    expect(getEdgeHoverIntensity(550, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(-0.75);
    expect(getEdgeHoverIntensity(600, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(-1);
  });

  it('stays idle in the center and for degenerate edge zones', () => {
    expect(getEdgeHoverIntensity(300, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0);
    expect(getEdgeHoverIntensity(100, VISIBLE_HORIZONTAL_INTERVAL, 0)).toBe(0);
    expect(getEdgeHoverIntensity(Number.NaN, VISIBLE_HORIZONTAL_INTERVAL, 100)).toBe(0);
  });

  it('feathers continuously across each sensor boundary instead of jumping to baseline speed', () => {
    const leadingBoundaryScale = getEdgeHoverVelocityScale(
      getEdgeHoverIntensity(200, VISIBLE_HORIZONTAL_INTERVAL, 100),
    );
    const leadingOnePixelScale = getEdgeHoverVelocityScale(
      getEdgeHoverIntensity(199, VISIBLE_HORIZONTAL_INTERVAL, 100),
    );
    const leadingFourPixelScale = getEdgeHoverVelocityScale(
      getEdgeHoverIntensity(196, VISIBLE_HORIZONTAL_INTERVAL, 100),
    );
    const trailingBoundaryScale = getEdgeHoverVelocityScale(
      getEdgeHoverIntensity(400, VISIBLE_HORIZONTAL_INTERVAL, 100),
    );
    const trailingOnePixelScale = getEdgeHoverVelocityScale(
      getEdgeHoverIntensity(401, VISIBLE_HORIZONTAL_INTERVAL, 100),
    );

    expect(leadingBoundaryScale).toBe(0);
    expect(leadingOnePixelScale).toBeGreaterThan(0);
    expect(leadingOnePixelScale).toBeLessThan(leadingFourPixelScale);
    expect(leadingFourPixelScale).toBeLessThan(1);
    expect(trailingBoundaryScale).toBe(0);
    expect(trailingOnePixelScale).toBeCloseTo(-leadingOnePixelScale);
  });

  it('preserves baseline motion before accelerating toward the bounded cap', () => {
    expect(getEdgeHoverVelocityScale(1)).toBe(6);
    expect(getEdgeHoverVelocityScale(0.01)).toBeGreaterThan(0);
    expect(getEdgeHoverVelocityScale(0.01)).toBeLessThan(1);
    expect(getEdgeHoverVelocityScale(0.08)).toBe(1);
    expect(getEdgeHoverVelocityScale(0.25)).toBeGreaterThan(1);
    expect(getEdgeHoverVelocityScale(0.25)).toBeLessThan(3);
    expect(getEdgeHoverVelocityScale(0.5)).toBe(3);
    expect(getEdgeHoverVelocityScale(0.75)).toBe(4.5);
    expect(getEdgeHoverVelocityScale(-0.5)).toBe(-3);
    expect(getEdgeHoverVelocityScale(0)).toBe(0);
    expect(getEdgeHoverVelocityScale(1, 1)).toBe(1);
    expect(getEdgeHoverVelocityScale(0.5, 2)).toBe(2);
    expect(getEdgeHoverVelocityScale(1, 99)).toBe(10);
    expect(getEdgeHoverVelocityScale(1, -1)).toBe(1);
    expect(getEdgeHoverVelocityScale(1, Number.NaN)).toBe(6);
    expect(getEdgeHoverVelocityScale(2)).toBe(6);
    expect(getEdgeHoverVelocityScale(Number.NaN)).toBe(0);
  });

  it('is odd, bounded, and monotonic across the complete acceleration field', () => {
    const depths = [0, 0.01, 0.04, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 1];
    const positiveScales = depths.map((depth) => getEdgeHoverVelocityScale(depth));

    for (let index = 1; index < positiveScales.length; index += 1) {
      expect(positiveScales[index]).toBeGreaterThanOrEqual(positiveScales[index - 1]);
    }

    for (const depth of depths) {
      expect(getEdgeHoverVelocityScale(-depth)).toBeCloseTo(
        -getEdgeHoverVelocityScale(depth),
      );
      expect(Math.abs(getEdgeHoverVelocityScale(depth))).toBeLessThanOrEqual(6);
    }
  });

  it('makes the reachable beyond-edge tier materially faster than the physical edge', () => {
    const interval = { end: 1000, size: 1000, start: 0 };
    const edgeSize = 72;
    const pointerPositions = {
      beyond: interval.end + 45,
      mid: interval.end - edgeSize + 42,
      physical: interval.end,
      shallow: interval.end - edgeSize + 14,
    };
    const scales = Object.fromEntries(
      Object.entries(pointerPositions).map(([name, pointerPosition]) => [
        name,
        Math.abs(
          getEdgeHoverVelocityScale(
            getEdgeHoverIntensity(pointerPosition, interval, edgeSize),
          ),
        ),
      ]),
    ) as Record<keyof typeof pointerPositions, number>;

    expect(scales.shallow).toBeLessThan(scales.mid);
    expect(scales.mid).toBeLessThan(scales.physical);
    expect(scales.physical).toBe(3);
    expect(scales.beyond).toBeGreaterThan(scales.physical * 1.6);
    expect(scales.beyond).toBeLessThanOrEqual(6);
  });
});
