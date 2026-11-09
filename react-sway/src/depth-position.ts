/** Maps one scroll phase onto periodic depth planes without crossing the perspective camera. */
export const DEFAULT_DEPTH_PERSPECTIVE = 800;
export const DEFAULT_DEPTH_SPACING = 420;

/** Bounds pixel lengths so periods and fade denominators remain finite and nonzero. */
export function normalizeDepthLength(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, value))
    : fallback;
}

export function getDepthItemState(
  position: number,
  index: number,
  count: number,
  perspective = DEFAULT_DEPTH_PERSPECTIVE,
  spacing = DEFAULT_DEPTH_SPACING,
) {
  if (count <= 0) return { opacity: 0, z: 0 };
  const period = count * spacing;
  const phase = (((index * spacing + position) % period) + period) % period;
  // Recycling occurs only at zero opacity; z always stays below the camera distance.
  const fade = Math.min(1, Math.min(phase, period - phase) / (spacing * 0.45));
  return { opacity: fade * fade * (3 - 2 * fade), z: perspective * 0.7 - phase };
}
