/**
 * Specifies wheel normalization and native-scroll ownership as pure contracts.
 */
import { describe, expect, it } from 'vitest';

import { getOwnedWheelDelta, normalizeWheelDelta } from '../wheel-input';

function createContainer() {
  const container = document.createElement('div');
  container.style.lineHeight = '20px';
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: 300 });
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: 500 });
  return container;
}

function createWheelEvent(init: WheelEventInit) {
  return new WheelEvent('wheel', { cancelable: true, ...init });
}

describe('wheel input policy', () => {
  it('normalizes pixel, line, and page deltas into pixels', () => {
    const container = createContainer();

    expect(normalizeWheelDelta(createWheelEvent({ deltaY: 12 }), container, 'y')).toBe(12);
    expect(normalizeWheelDelta(
      createWheelEvent({ deltaMode: WheelEvent.DOM_DELTA_LINE, deltaY: 3 }),
      container,
      'y',
    )).toBe(60);
    expect(normalizeWheelDelta(
      createWheelEvent({ deltaMode: WheelEvent.DOM_DELTA_PAGE, deltaY: 1 }),
      container,
      'y',
    )).toBeGreaterThanOrEqual(300);
  });

  it('uses legacy notch data only when modern vertical pixels under-report it', () => {
    const container = createContainer();
    const event = createWheelEvent({ deltaY: 1 });
    Object.defineProperty(event, 'wheelDeltaY', { value: -120 });

    expect(normalizeWheelDelta(event, container, 'y')).toBe(48);
    expect(normalizeWheelDelta(event, container, 'x')).toBe(0);
  });

  it.each([
    {
      expected: null,
      horizontal: true,
      init: { deltaY: 100 },
      mode: 'axis' as const,
      name: 'leaves vertical intent to the page for a horizontal surface',
    },
    {
      expected: 100,
      horizontal: true,
      init: { deltaY: 100, shiftKey: true },
      mode: 'axis' as const,
      name: 'maps shifted wheel intent onto a horizontal surface',
    },
    {
      expected: 100,
      horizontal: true,
      init: { deltaY: 100 },
      mode: 'capture' as const,
      name: 'captures cross-axis intent only in capture mode',
    },
    {
      expected: null,
      horizontal: false,
      init: { deltaX: 100, deltaY: 10 },
      mode: 'axis' as const,
      name: 'leaves horizontal intent to the page for a vertical surface',
    },
    {
      expected: 100,
      horizontal: false,
      init: { deltaX: 10, deltaY: 100 },
      mode: 'axis' as const,
      name: 'owns vertical intent for a vertical surface',
    },
  ])('$name', ({ expected, horizontal, init, mode }) => {
    expect(getOwnedWheelDelta(
      createWheelEvent(init),
      createContainer(),
      horizontal,
      mode,
    )).toBe(expected);
  });
});
