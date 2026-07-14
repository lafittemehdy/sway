/**
 * Normalizes wheel-device deltas and decides whether Sway owns a gesture.
 */

/** Defines whether Sway consumes axis-aligned gestures or every wheel event. */
export type SwayWheelMode = 'axis' | 'capture';

type WheelDeltaAxis = 'x' | 'y';

interface WheelEventWithLegacyDelta extends globalThis.WheelEvent {
  wheelDelta?: number;
  wheelDeltaY?: number;
}

/** Fallback pixel height for wheel events reported in line units. */
const WHEEL_LINE_HEIGHT_FALLBACK_PX = 16;

/** WheelEvent deltaMode value for line-based deltas. */
const WHEEL_MODE_LINE = 1;

/** WheelEvent deltaMode value for page-based deltas. */
const WHEEL_MODE_PAGE = 2;

/** Minimum pixel impulse for discrete wheel hardware reporting tiny pixel deltas. */
const WHEEL_PIXEL_MIN_DELTA_PX = 48;

/** Legacy wheelDelta magnitude that usually represents one physical wheel notch. */
const WHEEL_LEGACY_NOTCH_DELTA = 120;

function getLegacyWheelPixelDeltaY(event: globalThis.WheelEvent) {
  const { wheelDelta, wheelDeltaY } = event as WheelEventWithLegacyDelta;
  const legacyWheelDelta = typeof wheelDeltaY === 'number' ? wheelDeltaY : wheelDelta;

  if (typeof legacyWheelDelta !== 'number' || !Number.isFinite(legacyWheelDelta)) {
    return 0;
  }

  return -(legacyWheelDelta / WHEEL_LEGACY_NOTCH_DELTA) * WHEEL_PIXEL_MIN_DELTA_PX;
}

/** Converts line, page, modern pixel, and legacy wheel deltas to pixels. */
export function normalizeWheelDelta(
  event: globalThis.WheelEvent,
  container: HTMLElement,
  axis: WheelDeltaAxis,
) {
  const rawDelta = axis === 'x' ? event.deltaX : event.deltaY;

  if (event.deltaMode === WHEEL_MODE_LINE) {
    const computedLineHeight = Number.parseFloat(window.getComputedStyle(container).lineHeight);
    const lineHeight = Number.isFinite(computedLineHeight)
      ? computedLineHeight
      : WHEEL_LINE_HEIGHT_FALLBACK_PX;

    return rawDelta * lineHeight;
  }

  if (event.deltaMode === WHEEL_MODE_PAGE) {
    const pageSize = axis === 'x'
      ? Math.max(container.clientWidth, window.innerWidth, 1)
      : Math.max(container.clientHeight, window.innerHeight, 1);

    return rawDelta * pageSize;
  }

  if (axis === 'x') return rawDelta;

  const legacyWheelPixelDeltaY = getLegacyWheelPixelDeltaY(event);

  if (
    Math.abs(rawDelta) < WHEEL_PIXEL_MIN_DELTA_PX &&
    Math.abs(legacyWheelPixelDeltaY) >= WHEEL_PIXEL_MIN_DELTA_PX
  ) {
    return legacyWheelPixelDeltaY;
  }

  return rawDelta;
}

/**
 * Returns Sway's signed pixel delta, or null when native scroll chaining owns
 * the gesture. This partial function is the wheel-ownership boundary.
 */
export function getOwnedWheelDelta(
  event: globalThis.WheelEvent,
  container: HTMLElement,
  isHorizontal: boolean,
  wheelMode: SwayWheelMode,
) {
  const deltaX = normalizeWheelDelta(event, container, 'x');
  const deltaY = normalizeWheelDelta(event, container, 'y');
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (isHorizontal) {
    if (wheelMode === 'axis' && absDeltaX <= absDeltaY && !event.shiftKey) return null;
    return absDeltaX > absDeltaY ? deltaX : deltaY;
  }

  if (wheelMode === 'axis' && absDeltaX > absDeltaY) return null;
  return deltaY;
}
