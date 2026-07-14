/**
 * Defines the bounded spatial mapping from edge-hover depth to Sway velocity.
 */

/** Default edge-hover activation thickness in pixels. */
export const DEFAULT_EDGE_HOVER_SIZE = 96;

/** Default maximum edge-hover speed relative to the configured base speed. */
export const DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER = 6;

/** Upper bound for consumer-configured edge-hover speed amplification. */
const MAX_EDGE_HOVER_SPEED_MULTIPLIER = 10;

/** Normalized ingress band used to remove the zero-to-baseline velocity jump. */
const EDGE_HOVER_ENTRY_FEATHER_INTENSITY = 0.08;

/** Intensity reached at the physical edge of the visible viewport. */
const EDGE_HOVER_PHYSICAL_EDGE_INTENSITY = 0.5;

/** Historical physical-edge response retained before beyond-edge acceleration. */
const EDGE_HOVER_PHYSICAL_EDGE_SPEED_MULTIPLIER = 3;

export interface VisibleEdgeInterval {
  end: number;
  size: number;
  start: number;
}

function clampUnit(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function smoothUnitStep(value: number) {
  const unitValue = clampUnit(value);
  return unitValue * unitValue * (3 - 2 * unitValue);
}

export function normalizeEdgeHoverIntensity(value: number) {
  if (!Number.isFinite(value)) return 0;
  const clampedValue = Math.max(-1, Math.min(1, value));
  return clampedValue === 0 ? 0 : clampedValue;
}

export function normalizeEdgeHoverSpeedMultiplier(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER;
  return Math.max(1, Math.min(MAX_EDGE_HOVER_SPEED_MULTIPLIER, value));
}

/**
 * Maps signed edge depth onto a bounded velocity scale.
 *
 * Intensity carries direction and lies in [-1, 1]. The speed multiplier is
 * the maximum amplification reached one activation-zone width beyond the
 * visible edge.
 */
export function getEdgeHoverVelocityScale(
  intensity: number,
  speedMultiplier = DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
) {
  const normalizedIntensity = normalizeEdgeHoverIntensity(intensity);
  if (normalizedIntensity === 0) return 0;

  const direction = Math.sign(normalizedIntensity);
  const depth = Math.abs(normalizedIntensity);
  const maximumScale = normalizeEdgeHoverSpeedMultiplier(speedMultiplier);

  if (depth < EDGE_HOVER_ENTRY_FEATHER_INTENSITY) {
    return (
      direction *
      smoothUnitStep(depth / EDGE_HOVER_ENTRY_FEATHER_INTENSITY)
    );
  }

  const physicalEdgeScale = Math.min(
    EDGE_HOVER_PHYSICAL_EDGE_SPEED_MULTIPLIER,
    maximumScale,
  );

  if (depth <= EDGE_HOVER_PHYSICAL_EDGE_INTENSITY) {
    const physicalEdgeProgress =
      (depth - EDGE_HOVER_ENTRY_FEATHER_INTENSITY) /
      (EDGE_HOVER_PHYSICAL_EDGE_INTENSITY -
        EDGE_HOVER_ENTRY_FEATHER_INTENSITY);

    // This segment preserves the established 1x-to-3x response while making
    // both the ingress and physical-edge joins continuously differentiable.
    return (
      direction *
      (1 +
        (physicalEdgeScale - 1) * smoothUnitStep(physicalEdgeProgress))
    );
  }

  const beyondEdgeProgress =
    (depth - EDGE_HOVER_PHYSICAL_EDGE_INTENSITY) /
    (1 - EDGE_HOVER_PHYSICAL_EDGE_INTENSITY);

  // The physical edge is a semantic knee, not a saturation point: continuing
  // outward adds a bounded fourth-speed tier without changing the old edge feel.
  return (
    direction *
    (physicalEdgeScale +
      (maximumScale - physicalEdgeScale) *
        smoothUnitStep(beyondEdgeProgress))
  );
}

/**
 * Computes signed edge depth using a symmetric linear ramp.
 *
 * The inner edge of either activation zone maps to zero, the physical edge
 * maps to half intensity, and motion keeps accelerating outside the viewport
 * until it reaches the cap one activation-zone width beyond the visible edge.
 */
export function getEdgeHoverIntensity(
  pointerPosition: number,
  visibleInterval: VisibleEdgeInterval,
  edgeHoverSize: number,
) {
  const effectiveEdgeHoverSize = Math.min(
    Math.max(edgeHoverSize, 0),
    visibleInterval.size / 2,
  );
  if (effectiveEdgeHoverSize <= 0) return 0;

  const accelerationDistance = effectiveEdgeHoverSize * 2;

  const leadingEdgeEnd = visibleInterval.start + effectiveEdgeHoverSize;
  if (pointerPosition <= leadingEdgeEnd) {
    const leadingIntensity = clampUnit(
      (leadingEdgeEnd - pointerPosition) / accelerationDistance,
    );
    if (leadingIntensity > 0) return leadingIntensity;
  }

  const trailingEdgeStart = visibleInterval.end - effectiveEdgeHoverSize;
  if (pointerPosition >= trailingEdgeStart) {
    const trailingIntensity = clampUnit(
      (pointerPosition - trailingEdgeStart) / accelerationDistance,
    );
    if (trailingIntensity > 0) return -trailingIntensity;
  }

  return 0;
}
