/** Verifies depth rendering and input ownership across motion, lifecycle, and axis transitions. */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DEPTH_PERSPECTIVE,
  DEFAULT_DEPTH_SPACING,
  ReactSway,
  type ReactSwayHandle,
  type ReactSwayProps,
} from '../index';

const frames = new Map<number, FrameRequestCallback>();
let identifier = 0;
let time = 0;
beforeEach(() => {
  time = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++identifier, callback);
    return identifier;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  for (const [property, value] of Object.entries({ clientHeight: 600, clientWidth: 390, scrollHeight: 1200, scrollWidth: 900 })) {
    vi.spyOn(HTMLElement.prototype, property as 'clientHeight', 'get').mockReturnValue(value);
  }
});
afterEach(() => {
  cleanup();
  expect(frames.size).toBe(0);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function step(milliseconds = 16.667) {
  act(() => {
    time += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(time);
  });
}
function children() {
  return ['one', 'two', 'three', 'four'].map((id) => <div id={id} key={id}>{id}</div>);
}
function example(props: Partial<ReactSwayProps> = {}) {
  return <ReactSway axis="depth" direction="toward" lazy={false} {...props}>{props.children ?? children()}</ReactSway>;
}
function plane(container: HTMLElement, index = 1) {
  const item = container.querySelectorAll<HTMLElement>('.react-sway-depth-item')[index];
  if (!item) throw new Error('Expected a depth plane');
  return item;
}
function z(element: HTMLElement) {
  return Number.parseFloat(element.style.transform.split(',')[2]);
}

describe('depth mode', () => {
  it('exports the approved defaults and mounts each child exactly once', () => {
    const view = render(example());
    expect(DEFAULT_DEPTH_PERSPECTIVE).toBe(800);
    expect(DEFAULT_DEPTH_SPACING).toBe(420);
    expect(view.getByRole('region').style.perspective).toBe('800px');
    expect(view.container.querySelectorAll('.react-sway-depth-item')).toHaveLength(4);
    expect(view.container.querySelectorAll('[data-duplicate]')).toHaveLength(0);
    expect(view.container.querySelectorAll('#one')).toHaveLength(1);
    const initial = z(plane(view.container));
    step();
    expect(z(plane(view.container))).toBeGreaterThan(initial);
  });

  it.each(['toward', 'away'] as const)('infers depth from %s and travels in the requested direction', (direction) => {
    const view = render(<ReactSway direction={direction} lazy={false}>{children()}</ReactSway>);
    const initial = z(plane(view.container));
    step();
    expect(Math.sign(z(plane(view.container)) - initial)).toBe(direction === 'toward' ? 1 : -1);
  });

  it('accepts configurable geometry and normalizes invalid dimensions', () => {
    const view = render(example({ depthPerspective: 500, depthSpacing: 220 }));
    step();
    expect(view.getByRole('region').style.perspective).toBe('500px');
    expect(z(plane(view.container))).toBeCloseTo(130.5);
    view.rerender(example({ depthPerspective: Number.NaN, depthSpacing: 0 }));
    step();
    expect(view.getByRole('region').style.perspective).toBe('800px');
    expect(Number.isFinite(z(plane(view.container)))).toBe(true);
  });

  it('preserves manual wheel, keyboard, drag, and touch exploration when auto-scroll is off', () => {
    const view = render(example({ autoScroll: false }));
    const region = view.getByRole('region');
    step();
    const first = z(plane(view.container));
    fireEvent.wheel(region, { deltaY: 100 });
    expect(z(plane(view.container))).not.toBe(first);
    const wheel = z(plane(view.container));
    fireEvent.keyDown(region, { key: 'ArrowDown' });
    step();
    expect(z(plane(view.container))).not.toBe(wheel);
    fireEvent.mouseDown(region, { button: 0, clientY: 20 });
    const beforeDrag = z(plane(view.container));
    fireEvent.mouseMove(window, { clientY: 50 });
    expect(z(plane(view.container))).not.toBe(beforeDrag);
    fireEvent.mouseUp(window);
    fireEvent.touchStart(region, { touches: [{ clientX: 0, clientY: 10 }] });
    fireEvent.touchMove(window, { touches: [{ clientX: 0, clientY: 30 }] });
    const beforeTouch = z(plane(view.container));
    fireEvent.touchMove(window, { touches: [{ clientX: 0, clientY: 60 }] });
    expect(z(plane(view.container))).not.toBe(beforeTouch);
    fireEvent.touchEnd(window);
  });

  it('relinquishes gestures and external input while inactive without replaying momentum', () => {
    const ref = createRef<ReactSwayHandle>();
    const view = render(<ReactSway ref={ref} axis="depth" lazy={false}>{children()}</ReactSway>);
    step();
    fireEvent.mouseDown(view.getByRole('region'), { button: 0, clientY: 10 });
    fireEvent.mouseMove(window, { clientY: 100 });
    const stopped = z(plane(view.container));
    view.rerender(<ReactSway ref={ref} active={false} axis="depth" lazy={false}>{children()}</ReactSway>);
    step();
    fireEvent.mouseMove(window, { clientY: 300 });
    expect(fireEvent.wheel(view.getByRole('region'), { deltaY: 100 })).toBe(true);
    expect(ref.current?.handleWheel(new WheelEvent('wheel', { deltaY: 100, cancelable: true }))).toBe(false);
    expect(ref.current?.handleEdgeHover({ clientX: 10, clientY: 10 })).toBe(false);
    fireEvent.keyDown(view.getByRole('region'), { key: 'ArrowDown' });
    step(60_000);
    expect(z(plane(view.container))).toBe(stopped);
    expect(frames.size).toBe(0);
    view.rerender(<ReactSway ref={ref} axis="depth" lazy={false}>{children()}</ReactSway>);
    step();
    expect(z(plane(view.container)) - stopped).toBeCloseTo(0.5);
  });

  it('does not animate empty content and safely handles changing the child count', () => {
    const view = render(example({ children: [] }));
    step();
    expect(frames.size).toBe(0);
    view.rerender(example({ children: <div id="single">Single</div> }));
    step();
    expect(view.container.querySelectorAll('#single')).toHaveLength(1);
    expect(Number.isFinite(z(plane(view.container, 0)))).toBe(true);
    view.rerender(example({ children: [] }));
    step();
    expect(frames.size).toBe(0);
  });

  it.each(['horizontal', 'vertical'] as const)('clears stale %s translation when switching axes', (axis) => {
    const view = render(example({ axis }));
    step();
    const region = view.getByRole('region');
    expect(region.style.transform.replaceAll('px', '')).not.toBe('translate3d(0, 0, 0)');
    view.rerender(example());
    step();
    expect(region.style.transform.replaceAll('px', '')).toBe('translate3d(0, 0, 0)');
    expect(view.container.querySelectorAll('[data-duplicate]')).toHaveLength(0);
    view.rerender(example({ axis }));
    step();
    expect(region.style.perspective).toBe('');
    expect(view.container.querySelector('[data-duplicate]')).not.toBeNull();
  });

  it('pauses hidden pages and resumes at the same phase without consuming hidden time', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const view = render(example());
    step();
    const before = z(plane(view.container));
    act(() => { hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); });
    step(60_000);
    expect(z(plane(view.container))).toBe(before);
    act(() => { hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); });
    step();
    expect(z(plane(view.container)) - before).toBeCloseTo(0.5);
  });

  it.each([false, true])('respects system or explicit reduced motion (%s) while allowing deliberate steps', (reducedMotion) => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: !reducedMotion });
    const view = render(example({ reducedMotion }));
    step();
    const before = z(plane(view.container));
    step(1000);
    expect(z(plane(view.container))).toBe(before);
    fireEvent.keyDown(view.getByRole('region'), { key: 'ArrowDown' });
    expect(z(plane(view.container))).not.toBe(before);
    const arrow = z(plane(view.container));
    fireEvent.wheel(view.getByRole('region'), { deltaY: 100 });
    expect(z(plane(view.container))).not.toBe(arrow);
    const manual = z(plane(view.container));
    step();
    step(1000);
    expect(z(plane(view.container))).toBe(manual);
  });

  it('preserves keyed child identity and native controls across updates and suspension', () => {
    const click = vi.fn();
    const content = [<button key="button" onClick={click}>Open</button>, <div key="other">Other</div>];
    const view = render(example({ children: content }));
    const button = view.getByRole('button');
    step();
    const before = z(plane(view.container));
    fireEvent.mouseDown(button, { button: 0, clientY: 20 });
    fireEvent.mouseMove(window, { clientY: 80 });
    expect(z(plane(view.container))).toBe(before);
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
    view.rerender(example({ active: false, children: [...content].reverse() }));
    expect(view.getByRole('button')).toBe(button);
    fireEvent.click(button);
    expect(click).toHaveBeenCalledTimes(2);
    expect(view.getByRole('region')).not.toHaveAttribute('tabindex');
  });
});
