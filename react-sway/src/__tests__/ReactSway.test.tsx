/**
 * Behavioral and regression tests for ReactSway.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_EDGE_HOVER_SIZE,
  DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
  ReactSway,
} from '../index';
import type { ReactSwayHandle } from '../index';

const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

let mockIntersectionCallback: IntersectionObserverCallback | null = null;
let mockIntersectionOptions: IntersectionObserverInit | undefined;
let mockResizeCallback: (() => void) | null = null;
const mockResizeDisconnect = vi.fn();
const mockResizeObserve = vi.fn();

beforeEach(() => {
  mockDisconnect.mockClear();
  mockObserve.mockClear();
  mockResizeDisconnect.mockClear();
  mockResizeObserve.mockClear();
  mockUnobserve.mockClear();

  const MockIntersectionObserver = vi.fn(function (
    this: IntersectionObserver,
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    mockIntersectionCallback = callback;
    mockIntersectionOptions = options;
    this.disconnect = mockDisconnect;
    this.observe = mockObserve;
    this.root = null;
    this.rootMargin = '';
    this.takeRecords = vi.fn(() => []);
    this.thresholds = [];
    this.unobserve = mockUnobserve;
  });
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

  const MockResizeObserver = vi.fn(function (this: ResizeObserver, callback: ResizeObserverCallback) {
    mockResizeCallback = callback as unknown as () => void;
    this.disconnect = mockResizeDisconnect;
    this.observe = mockResizeObserve;
    this.unobserve = vi.fn();
  });
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  mockIntersectionCallback = null;
  mockIntersectionOptions = undefined;
  mockResizeCallback = null;
  vi.restoreAllMocks();
});

const commitObservedMeasurement = async () => {
  await act(async () => {
    mockResizeCallback?.();
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
};

describe('public edge-hover configuration contract', () => {
  it('exports stable defaults for application-level interaction profiles', () => {
    expect(DEFAULT_EDGE_HOVER_SIZE).toBe(96);
    expect(DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER).toBe(6);
  });
});

describe('ReactSway', () => {
  describe('rendering', () => {
    it('renders children content with duplicates', () => {
      render(
        <ReactSway>
          <div data-testid="child">Hello</div>
        </ReactSway>
      );

      const children = screen.getAllByTestId('child');
      expect(children).toHaveLength(2);
    });

    it('preserves canonical and consumer-provided class names', () => {
      const { container } = render(
        <ReactSway className="consumer-sway-surface">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container');
      expect(swayContainer).toBeInTheDocument();
      expect(swayContainer).toHaveClass('scroller-content', 'consumer-sway-surface');
    });

    it('renders duplicate groups with accessibility attributes', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const duplicates = container.querySelectorAll('[data-duplicate="true"]');
      expect(duplicates).toHaveLength(1);

      duplicates.forEach((duplicate) => {
        expect(duplicate.getAttribute('aria-hidden')).toBe('true');
        expect(duplicate).toHaveAttribute('inert');
        expect(duplicate.getAttribute('role')).toBe('presentation');
        expect((duplicate as HTMLElement).style.pointerEvents).toBe('none');
        expect(duplicate.tagName.toLowerCase()).toBe('aside');
      });
    });

    it('adds enough duplicate groups when original content is shorter than the viewport', async () => {
      const { container } = render(
        <ReactSway>
          <div>Short content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;

      Object.defineProperty(originalGroup, 'scrollHeight', {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(viewport, 'clientHeight', {
        configurable: true,
        value: 420,
      });

      act(() => {
        mockResizeCallback?.();
      });

      await waitFor(() => {
        expect(container.querySelectorAll('.content-group')).toHaveLength(6);
      });
    });

    it('renders original content group as div', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const original = container.querySelector('.content-group.original');
      expect(original).toBeInTheDocument();
      expect(original?.tagName.toLowerCase()).toBe('div');
    });

    it('applies translate3d transform', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.transform).toContain('translate3d');
    });

    it('renders horizontal layout when axis is horizontal', () => {
      const { container } = render(
        <ReactSway axis="horizontal">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.display).toBe('flex');
      expect(swayContainer.style.height).toBe('100%');
      expect(swayContainer.style.width).toBe('max-content');
      expect(swayContainer.style.touchAction).toBe('pan-y');
    });

    it('infers horizontal layout from left and right directions', () => {
      const { container, rerender } = render(
        <ReactSway direction="left">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.display).toBe('flex');
      expect(swayContainer.style.touchAction).toBe('pan-y');

      rerender(
        <ReactSway direction="right">
          <div>Content</div>
        </ReactSway>
      );

      expect(swayContainer.style.display).toBe('flex');
      expect(swayContainer.style.touchAction).toBe('pan-y');
    });

    it('renders horizontal duplicate groups as non-interactive flex segments', () => {
      const { container } = render(
        <ReactSway axis="horizontal">
          <div>Content</div>
        </ReactSway>
      );

      const duplicates = container.querySelectorAll<HTMLElement>('[data-duplicate="true"]');

      duplicates.forEach((duplicate) => {
        expect(duplicate.style.display).toBe('flex');
        expect(duplicate.style.flex).toBe('0 0 auto');
        expect(duplicate.style.pointerEvents).toBe('none');
      });
    });

    it('sizes vertical layout by content height so translated tracks cannot expose empty space', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.height).toBe('max-content');
      expect(swayContainer.style.minHeight).toBe('100%');
      expect(swayContainer.style.touchAction).toBe('pan-x');
      expect(swayContainer.style.width).toBe('100%');
    });

    it('leaves native touch handling available when drag is disabled', () => {
      const { container } = render(
        <ReactSway draggable={false}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.touchAction).toBe('auto');
    });

    it('allows native scroll chaining outside full wheel capture mode', () => {
      const { container } = render(
        <ReactSway wheelMode="axis">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.overscrollBehavior).toBe('auto');
    });

    it('contains native overscroll only when wheel capture is explicit', () => {
      const { container } = render(
        <ReactSway wheelMode="capture">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.overscrollBehavior).toBe('contain');
    });

    it('allows native scroll chaining when wheel handling is disabled', () => {
      const { container } = render(
        <ReactSway wheelEnabled={false} wheelMode="capture">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.overscrollBehavior).toBe('auto');
    });

    it('adds enough horizontal duplicate groups when original content is narrower than the viewport', async () => {
      const { container } = render(
        <ReactSway axis="horizontal">
          <div>Short content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;

      Object.defineProperty(originalGroup, 'scrollWidth', {
        configurable: true,
        value: 100,
      });
      Object.defineProperty(viewport, 'clientWidth', {
        configurable: true,
        value: 420,
      });

      act(() => {
        mockResizeCallback?.();
      });

      await waitFor(() => {
        expect(container.querySelectorAll('.content-group')).toHaveLength(6);
      });
    });
  });

  describe('draggable prop', () => {
    const hasWindowListenerCall = (
      spy: ReturnType<typeof vi.spyOn<typeof window, 'addEventListener'>>,
      eventName: string,
    ) => spy.mock.calls.some(([type]) => type === eventName);

    it('applies grab cursor when draggable (default)', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.cursor).toBe('grab');
    });

    it('applies default cursor when draggable is false', () => {
      const { container } = render(
        <ReactSway draggable={false}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.style.cursor).toBe('default');
    });

    it('does not install idle global drag listeners before a drag starts', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(hasWindowListenerCall(addEventListenerSpy, 'mousemove')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'mouseup')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchmove')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchend')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchcancel')).toBe(false);
    });

    it('does not install idle global drag listeners when drag is disabled', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(
        <ReactSway draggable={false}>
          <div>Content</div>
        </ReactSway>
      );

      expect(hasWindowListenerCall(addEventListenerSpy, 'mousemove')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'mouseup')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchmove')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchend')).toBe(false);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchcancel')).toBe(false);
    });

    it('installs global mouse drag listeners only for the active drag', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      addEventListenerSpy.mockClear();
      removeEventListenerSpy.mockClear();

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.mouseDown(swayContainer, { clientX: 0, clientY: 0 });

      expect(hasWindowListenerCall(addEventListenerSpy, 'mousemove')).toBe(true);
      expect(hasWindowListenerCall(addEventListenerSpy, 'mouseup')).toBe(true);
      expect(hasWindowListenerCall(addEventListenerSpy, 'blur')).toBe(true);

      fireEvent.mouseUp(window, { clientX: 0, clientY: 0 });

      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'mousemove')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'mouseup')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'blur')).toBe(true);
    });

    it('updates position and cursor during vertical mouse drag', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      Object.defineProperty(originalGroup, 'scrollHeight', {
        configurable: true,
        value: 120,
      });
      await commitObservedMeasurement();

      fireEvent.mouseDown(swayContainer, { clientX: 0, clientY: 0 });

      expect(document.activeElement).toBe(swayContainer);
      expect(swayContainer.style.cursor).toBe('grabbing');

      fireEvent.mouseMove(window, { clientX: 0, clientY: -24 });

      expect(onScroll).toHaveBeenCalledWith(-24);
      expect(swayContainer.style.transform).toContain('-24px');

      fireEvent.mouseUp(window, { clientX: 0, clientY: -24 });
      expect(swayContainer.style.cursor).toBe('grab');
    });

    it('updates position during horizontal mouse drag', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} axis="horizontal" onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      Object.defineProperty(originalGroup, 'scrollWidth', {
        configurable: true,
        value: 120,
      });
      await commitObservedMeasurement();

      fireEvent.mouseDown(swayContainer, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(window, { clientX: -32, clientY: 0 });

      expect(onScroll).toHaveBeenCalledWith(-32);
      expect(swayContainer.style.transform).toContain('-32px');

      fireEvent.mouseUp(window, { clientX: -32, clientY: 0 });
    });

    it('cleans up active mouse drag listeners on blur', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.mouseDown(swayContainer, { clientX: 0, clientY: 0 });
      fireEvent.blur(window);

      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'mousemove')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'mouseup')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'blur')).toBe(true);
      expect(swayContainer.style.cursor).toBe('grab');
    });
  });

  describe('keyboard prop', () => {
    it('is focusable when keyboard is enabled (default)', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.getAttribute('tabindex')).toBe('0');
    });

    it('is not focusable when keyboard is disabled', () => {
      const { container } = render(
        <ReactSway keyboard={false}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      expect(swayContainer.getAttribute('tabindex')).toBeNull();
    });

    it('ignores keyboard events when keyboard is disabled', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway keyboard={false} onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.keyDown(swayContainer, { key: ' ' });

      expect(onPause).not.toHaveBeenCalled();
    });

    it('maps vertical arrow keys to vertical movement only', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} friction={1} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.keyDown(swayContainer, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });

      cleanup();

      const ignoredScroll = vi.fn();
      const { container: ignoredContainer } = render(
        <ReactSway autoScroll={false} friction={1} onScroll={ignoredScroll}>
          <div>Content</div>
        </ReactSway>
      );
      const ignoredSwayContainer = ignoredContainer.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.keyDown(ignoredSwayContainer, { key: 'ArrowLeft' });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(ignoredScroll).not.toHaveBeenCalled();
    });

    it('maps horizontal arrow keys to horizontal movement only', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} axis="horizontal" friction={1} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.keyDown(swayContainer, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });

      cleanup();

      const ignoredScroll = vi.fn();
      const { container: ignoredContainer } = render(
        <ReactSway autoScroll={false} axis="horizontal" friction={1} onScroll={ignoredScroll}>
          <div>Content</div>
        </ReactSway>
      );
      const ignoredSwayContainer = ignoredContainer.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.keyDown(ignoredSwayContainer, { key: 'ArrowDown' });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(ignoredScroll).not.toHaveBeenCalled();
    });

    it('moves to loop endpoints with End and Home keys', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      Object.defineProperty(originalGroup, 'scrollHeight', {
        configurable: true,
        value: 120,
      });

      await commitObservedMeasurement();

      fireEvent.keyDown(swayContainer, { key: 'End' });
      expect(onScroll).toHaveBeenLastCalledWith(-120);

      fireEvent.keyDown(swayContainer, { key: 'Home' });
      expect(onScroll).toHaveBeenLastCalledWith(0);
    });
  });

  describe('callbacks', () => {
    it('does not react to keyboard events when container is not focused', () => {
      const onPause = vi.fn();
      render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      fireEvent.keyDown(document, { key: ' ' });
      expect(onPause).not.toHaveBeenCalled();
    });

    it('fires onPause when space key pauses', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.focus();
      fireEvent.keyDown(swayContainer, { key: ' ' });
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('fires onResume when space key unpauses', () => {
      const onResume = vi.fn();
      const { container } = render(
        <ReactSway onResume={onResume}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.focus();

      // First press pauses, second unpauses
      fireEvent.keyDown(swayContainer, { key: ' ' });
      fireEvent.keyDown(swayContainer, { key: ' ' });
      expect(onResume).toHaveBeenCalledOnce();
    });

    it('uses the latest onScroll callback after rerender', () => {
      const initialOnScroll = vi.fn();
      const nextOnScroll = vi.fn();
      const { container, rerender } = render(
        <ReactSway autoScroll={false} onScroll={initialOnScroll}>
          <div>Content</div>
        </ReactSway>
      );

      rerender(
        <ReactSway autoScroll={false} onScroll={nextOnScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.wheel(swayContainer, { deltaY: 120 });

      expect(initialOnScroll).not.toHaveBeenCalled();
      expect(nextOnScroll).toHaveBeenCalled();
    });

    it('uses the latest onPause callback after rerender', () => {
      const initialOnPause = vi.fn();
      const nextOnPause = vi.fn();
      const { container, rerender } = render(
        <ReactSway onPause={initialOnPause}>
          <div>Content</div>
        </ReactSway>
      );

      rerender(
        <ReactSway onPause={nextOnPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.wheel(swayContainer, { deltaY: 120 });

      expect(initialOnPause).not.toHaveBeenCalled();
      expect(nextOnPause).toHaveBeenCalledOnce();
    });

    it('uses the latest delayed onResume callback after rerender', () => {
      vi.useFakeTimers();

      try {
        const initialOnResume = vi.fn();
        const nextOnResume = vi.fn();
        const { container, rerender } = render(
          <ReactSway onResume={initialOnResume} resumeDelay={50}>
            <div>Content</div>
          </ReactSway>
        );

        const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
        fireEvent.wheel(swayContainer, { deltaY: 120 });

        rerender(
          <ReactSway onResume={nextOnResume} resumeDelay={50}>
            <div>Content</div>
          </ReactSway>
        );

        act(() => {
          vi.advanceTimersByTime(60);
        });

        expect(initialOnResume).not.toHaveBeenCalled();
        expect(nextOnResume).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not fire onPause when pauseOnInteraction is false', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause} pauseOnInteraction={false}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.focus();
      fireEvent.keyDown(swayContainer, { key: 'ArrowDown' });
      expect(onPause).not.toHaveBeenCalled();
    });

    it('does not resume auto-scroll if parent disables autoScroll during resume delay', () => {
      vi.useFakeTimers();

      const onResume = vi.fn();
      const { container, rerender } = render(
        <ReactSway onResume={onResume} resumeDelay={100}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.wheel(swayContainer, { deltaY: 120 });

      rerender(
        <ReactSway autoScroll={false} onResume={onResume} resumeDelay={100}>
          <div>Content</div>
        </ReactSway>
      );

      vi.advanceTimersByTime(150);
      expect(onResume).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('auto-scroll', () => {
    it('does not emit automatic scroll updates when autoScroll is false', async () => {
      const onScroll = vi.fn();
      render(
        <ReactSway autoScroll={false} onScroll={onScroll} speed={8}>
          <div>Content</div>
        </ReactSway>
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onScroll).not.toHaveBeenCalled();
    });

    it('scrolls upward by default', async () => {
      const onScroll = vi.fn();
      render(
        <ReactSway onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });
    });

    it('scrolls downward for direction="down"', async () => {
      const onScroll = vi.fn();
      render(
        <ReactSway direction="down" onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });
    });

    it('scrolls horizontally according to left and right directions', async () => {
      const leftScroll = vi.fn();
      render(
        <ReactSway direction="left" onScroll={leftScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      await waitFor(() => {
        expect(leftScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });

      cleanup();

      const rightScroll = vi.fn();
      render(
        <ReactSway direction="right" onScroll={rightScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      await waitFor(() => {
        expect(rightScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });
    });
  });

  describe('IntersectionObserver', () => {
    it('sets up observer for content items', () => {
      render(
        <ReactSway>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it('observes each lazy content item across original and duplicate loop groups', () => {
      render(
        <ReactSway>
          <div className="content-item">First</div>
          <div className="content-item">Second</div>
        </ReactSway>
      );

      expect(mockObserve).toHaveBeenCalledTimes(4);
    });

    it('passes custom lazy observer options to IntersectionObserver', () => {
      render(
        <ReactSway lazyRootMargin="250px" lazyThreshold={0.5}>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      expect(mockIntersectionOptions).toMatchObject({
        root: null,
        rootMargin: '250px',
        threshold: 0.5,
      });
    });

    it.each([
      { expected: 0, threshold: -1 },
      { expected: 1, threshold: 2 },
      { expected: 0.01, threshold: Number.NaN },
    ])('normalizes lazy threshold $threshold to $expected', ({ expected, threshold }) => {
      render(
        <ReactSway lazyThreshold={threshold}>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      expect(mockIntersectionOptions?.threshold).toBe(expected);
    });

    it('marks intersecting lazy content items as visible', () => {
      const { container } = render(
        <ReactSway>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      const item = container.querySelector('.content-item') as HTMLElement;
      mockIntersectionCallback?.(
        [{ isIntersecting: true, target: item } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(item).toHaveClass('visible');
    });

    it('leaves non-intersecting lazy content items hidden', () => {
      const { container } = render(
        <ReactSway>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      const item = container.querySelector('.content-item') as HTMLElement;
      mockIntersectionCallback?.(
        [{ isIntersecting: false, target: item } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );

      expect(item).not.toHaveClass('visible');
    });

    it('unobserves lazy items and disconnects on unmount', () => {
      const { unmount } = render(
        <ReactSway>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      unmount();

      expect(mockUnobserve).toHaveBeenCalledTimes(2);
      expect(mockDisconnect).toHaveBeenCalledOnce();
    });

    it('handles missing IntersectionObserver gracefully', () => {
      vi.stubGlobal('IntersectionObserver', undefined);

      expect(() => {
        render(
          <ReactSway>
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });

    it('does not set up observer when lazy is false', () => {
      const observerSpy = vi.fn();
      vi.stubGlobal('IntersectionObserver', observerSpy);

      render(
        <ReactSway lazy={false}>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      expect(observerSpy).not.toHaveBeenCalled();
    });
  });

  describe('wheel events', () => {
    const dispatchCancelableWheel = (element: HTMLElement, init: WheelEventInit) => {
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ...init,
      });

      const propagated = element.dispatchEvent(wheelEvent);
      return { propagated, wheelEvent };
    };

    const expectMinimumScroll = async (onScroll: ReturnType<typeof vi.fn>, minimumDistance: number) => {
      await waitFor(() => {
        const positions = onScroll.mock.calls.map(([position]) => position as number);
        expect(Math.min(...positions)).toBeLessThanOrEqual(-minimumDistance);
      });
    };

    const renderWheelHarness = () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} friction={1} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      return { onScroll, swayContainer };
    };

    it('applies wheel delta to velocity (fires onPause)', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.wheel(swayContainer, { deltaY: 100 });
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('lets vertical wheel intent pass through horizontal Sway in axis mode', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const { propagated, wheelEvent } = dispatchCancelableWheel(swayContainer, { deltaY: 100 });

      expect(propagated).toBe(true);
      expect(wheelEvent.defaultPrevented).toBe(false);
      expect(onPause).not.toHaveBeenCalled();
    });

    it('emits pause only on the active-to-paused transition', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      fireEvent.wheel(swayContainer, { deltaY: 100 });
      fireEvent.wheel(swayContainer, { deltaY: 100 });
      fireEvent.wheel(swayContainer, { deltaY: 100 });

      expect(onPause).toHaveBeenCalledOnce();
    });

    it('does not emit pause when autonomous scrolling is already disabled', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      fireEvent.wheel(swayContainer, { deltaY: 100 });

      expect(onPause).not.toHaveBeenCalled();
    });

    it('consumes horizontal wheel intent in horizontal axis mode', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const { propagated, wheelEvent } = dispatchCancelableWheel(swayContainer, { deltaX: 100, deltaY: 12 });

      expect(propagated).toBe(false);
      expect(wheelEvent.defaultPrevented).toBe(true);
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('treats shift wheel as horizontal intent in horizontal axis mode', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const { propagated, wheelEvent } = dispatchCancelableWheel(swayContainer, { deltaY: 100, shiftKey: true });

      expect(propagated).toBe(false);
      expect(wheelEvent.defaultPrevented).toBe(true);
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('captures vertical wheel intent for horizontal Sway when wheelMode is capture', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause} wheelMode="capture">
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const { propagated, wheelEvent } = dispatchCancelableWheel(swayContainer, { deltaY: 100 });

      expect(propagated).toBe(false);
      expect(wheelEvent.defaultPrevented).toBe(true);
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('lets horizontal wheel intent pass through vertical Sway in axis mode', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const { propagated, wheelEvent } = dispatchCancelableWheel(swayContainer, { deltaX: 100, deltaY: 12 });

      expect(propagated).toBe(true);
      expect(wheelEvent.defaultPrevented).toBe(false);
      expect(onPause).not.toHaveBeenCalled();
    });

    it('exposes an imperative wheel route for external wheel ownership', () => {
      const onPause = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      render(
        <ReactSway axis="horizontal" onPause={onPause} ref={ref} wheelMode="capture">
          <div>Content</div>
        </ReactSway>
      );
      const wheelEvent = new WheelEvent('wheel', {
        cancelable: true,
        deltaY: 100,
      });

      expect(ref.current?.handleWheel(wheelEvent)).toBe(true);
      expect(wheelEvent.defaultPrevented).toBe(true);
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('leaves external cross-axis wheel intent unowned in axis mode', () => {
      const onPause = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      render(
        <ReactSway axis="horizontal" onPause={onPause} ref={ref} wheelMode="axis">
          <div>Content</div>
        </ReactSway>
      );
      const wheelEvent = new WheelEvent('wheel', {
        cancelable: true,
        deltaY: 100,
      });

      expect(ref.current?.handleWheel(wheelEvent)).toBe(false);
      expect(wheelEvent.defaultPrevented).toBe(false);
      expect(onPause).not.toHaveBeenCalled();
    });

    it('leaves external wheel events unowned when wheel handling is disabled', () => {
      const onPause = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      render(
        <ReactSway onPause={onPause} ref={ref} wheelEnabled={false}>
          <div>Content</div>
        </ReactSway>
      );
      const wheelEvent = new WheelEvent('wheel', {
        cancelable: true,
        deltaY: 100,
      });

      expect(ref.current?.handleWheel(wheelEvent)).toBe(false);
      expect(wheelEvent.defaultPrevented).toBe(false);
      expect(onPause).not.toHaveBeenCalled();
    });

    it('normalizes line-based wheel deltas before applying velocity', async () => {
      const { onScroll, swayContainer } = renderWheelHarness();
      fireEvent.wheel(swayContainer, { deltaMode: 1, deltaY: 3 });

      await expectMinimumScroll(onScroll, 14);
    });

    it('normalizes page-based wheel deltas before applying velocity', async () => {
      const { onScroll, swayContainer } = renderWheelHarness();
      fireEvent.wheel(swayContainer, { deltaMode: 2, deltaY: 1 });

      await expectMinimumScroll(onScroll, 100);
    });

    it('normalizes tiny pixel deltas from discrete wheel hardware', async () => {
      const { onScroll, swayContainer } = renderWheelHarness();
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaMode: 0,
        deltaY: 1,
      });
      Object.defineProperty(wheelEvent, 'wheelDelta', {
        value: -120,
      });
      swayContainer.dispatchEvent(wheelEvent);

      await expectMinimumScroll(onScroll, 10);
    });

    it('falls back to legacy wheel deltas when pixel delta is zero', async () => {
      const { onScroll, swayContainer } = renderWheelHarness();
      const wheelEvent = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaMode: 0,
        deltaY: 0,
      });
      Object.defineProperty(wheelEvent, 'wheelDeltaY', {
        value: -120,
      });
      swayContainer.dispatchEvent(wheelEvent);

      await expectMinimumScroll(onScroll, 10);
    });

    it('caps velocity at MAX_VELOCITY', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      // Fire many large wheel events to exceed MAX_VELOCITY (150)
      for (let i = 0; i < 20; i++) {
        fireEvent.wheel(swayContainer, { deltaY: 1000 });
      }

      // If velocity were uncapped, it would be 20 * 1000 * 0.14 = 2800.
      // The burst is one pause transition and velocity remains bounded.
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('does not respond to wheel when wheelEnabled is false', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause} wheelEnabled={false}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      fireEvent.wheel(swayContainer, { deltaY: 100 });
      expect(onPause).not.toHaveBeenCalled();
    });
  });

  describe('touch interactions', () => {
    const hasWindowListenerCall = (
      spy: ReturnType<typeof vi.spyOn<typeof window, 'addEventListener'>>,
      eventName: string,
    ) => spy.mock.calls.some(([type]) => type === eventName);

    const createTouchEvent = (
      type: string,
      touch: { clientX: number; clientY: number } | null,
    ) => {
      const touchEvent = new Event(type, { bubbles: true, cancelable: true }) as Event & {
        touches: ArrayLike<{ clientX: number; clientY: number }>;
      };
      Object.defineProperty(touchEvent, 'touches', {
        value: touch ? { 0: touch, length: 1 } : { length: 0 },
      });
      return touchEvent;
    };

    it('rejects multi-touch gestures on start', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;

      // jsdom lacks the Touch constructor, so create a minimal synthetic event
      const touchStartEvent = new Event('touchstart', { bubbles: true }) as Event & { touches: { length: number } };
      Object.defineProperty(touchStartEvent, 'touches', {
        value: { length: 2 },
      });
      swayContainer.dispatchEvent(touchStartEvent);

      // onPause should not fire because multi-touch is rejected
      expect(onPause).not.toHaveBeenCalled();
    });

    it('lets vertical touch pan pass through horizontal Sway', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      const touchMoveEvent = createTouchEvent('touchmove', { clientX: 1, clientY: 24 });
      window.dispatchEvent(touchMoveEvent);

      expect(touchMoveEvent.defaultPrevented).toBe(false);
      expect(onPause).not.toHaveBeenCalled();
    });

    it('captures horizontal touch pan for horizontal Sway after axis lock', () => {
      const onPause = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" onPause={onPause}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      const touchMoveEvent = createTouchEvent('touchmove', { clientX: 24, clientY: 1 });
      window.dispatchEvent(touchMoveEvent);

      expect(touchMoveEvent.defaultPrevented).toBe(true);
      expect(onPause).toHaveBeenCalledOnce();
    });

    it('updates vertical position after touch axis lock', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      Object.defineProperty(originalGroup, 'scrollHeight', {
        configurable: true,
        value: 120,
      });
      await commitObservedMeasurement();

      swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      const touchMoveEvent = createTouchEvent('touchmove', { clientX: 1, clientY: -24 });
      window.dispatchEvent(touchMoveEvent);

      expect(touchMoveEvent.defaultPrevented).toBe(true);
      expect(onScroll).toHaveBeenCalledWith(-24);
      expect(swayContainer.style.transform).toContain('-24px');
    });

    it('updates horizontal position after touch axis lock', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway autoScroll={false} axis="horizontal" onScroll={onScroll}>
          <div>Content</div>
        </ReactSway>
      );

      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      Object.defineProperty(originalGroup, 'scrollWidth', {
        configurable: true,
        value: 120,
      });
      await commitObservedMeasurement();

      swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
      const touchMoveEvent = createTouchEvent('touchmove', { clientX: -24, clientY: 1 });
      window.dispatchEvent(touchMoveEvent);

      expect(touchMoveEvent.defaultPrevented).toBe(true);
      expect(onScroll).toHaveBeenCalledWith(-24);
      expect(swayContainer.style.transform).toContain('-24px');
    });

    it('schedules auto-scroll resume after an active touch gesture ends', () => {
      vi.useFakeTimers();

      try {
        const onResume = vi.fn();
        const { container } = render(
          <ReactSway onResume={onResume} resumeDelay={50}>
            <div>Content</div>
          </ReactSway>
        );

        const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
        swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));
        window.dispatchEvent(createTouchEvent('touchmove', { clientX: 0, clientY: -24 }));
        window.dispatchEvent(createTouchEvent('touchend', null));

        act(() => {
          vi.advanceTimersByTime(60);
        });

        expect(onResume).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    });

    it('installs global touch listeners only for the active touch gesture', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      addEventListenerSpy.mockClear();
      removeEventListenerSpy.mockClear();

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      swayContainer.dispatchEvent(createTouchEvent('touchstart', { clientX: 0, clientY: 0 }));

      expect(hasWindowListenerCall(addEventListenerSpy, 'touchmove')).toBe(true);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchend')).toBe(true);
      expect(hasWindowListenerCall(addEventListenerSpy, 'touchcancel')).toBe(true);

      window.dispatchEvent(createTouchEvent('touchcancel', null));

      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'touchend')).toBe(true);
      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'touchcancel')).toBe(true);
    });
  });

  describe('ResizeObserver', () => {
    it('sets up observer on mount', () => {
      render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(mockResizeObserve).toHaveBeenCalled();
    });

    it('disconnects observer on unmount', () => {
      const { unmount } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      unmount();

      expect(mockResizeDisconnect).toHaveBeenCalledOnce();
    });

    it('registers and removes the window resize fallback listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(addEventListenerSpy.mock.calls.some(([type]) => type === 'resize')).toBe(true);

      unmount();

      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'resize')).toBe(true);
    });

    it('observes original content and viewport instead of the translated track', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;

      expect(mockResizeObserve).toHaveBeenCalledWith(originalGroup);
      expect(mockResizeObserve).toHaveBeenCalledWith(viewport);
      expect(mockResizeObserve).not.toHaveBeenCalledWith(swayContainer);
    });

    it('coalesces rapid resize observations into a single frame', () => {
      vi.useFakeTimers();

      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const originalGroup = container.querySelector('.content-group.original') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      let scrollHeightReadCount = 0;

      Object.defineProperty(originalGroup, 'scrollHeight', {
        configurable: true,
        get() {
          scrollHeightReadCount += 1;
          return 100;
        },
      });
      Object.defineProperty(viewport, 'clientHeight', {
        configurable: true,
        value: 420,
      });

      for (let i = 0; i < 5; i++) {
        mockResizeCallback?.();
      }

      expect(scrollHeightReadCount).toBe(0);

      act(() => {
        vi.advanceTimersByTime(20);
      });

      expect(scrollHeightReadCount).toBe(1);

      vi.useRealTimers();
    });

    it('handles missing ResizeObserver gracefully', () => {
      vi.stubGlobal('ResizeObserver', undefined);

      expect(() => {
        render(
          <ReactSway>
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });
  });

  describe('visibility change', () => {
    it('does not throw when visibility changes', () => {
      render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        fireEvent(document, new Event('visibilitychange'));

        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        fireEvent(document, new Event('visibilitychange'));
      }).not.toThrow();
    });

    it('removes visibility listener on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(addEventListenerSpy.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);

      unmount();

      expect(removeEventListenerSpy.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(true);
    });
  });

  describe('direction prop', () => {
    it('accepts direction="down"', () => {
      expect(() => {
        render(
          <ReactSway direction="down">
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });

    it('accepts direction="up" (default)', () => {
      expect(() => {
        render(
          <ReactSway direction="up">
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });

    it('can switch direction via rerender', () => {
      const { rerender } = render(
        <ReactSway direction="up">
          <div>Content</div>
        </ReactSway>
      );

      expect(() => {
        rerender(
          <ReactSway direction="down">
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });

    it('accepts horizontal directions', () => {
      expect(() => {
        render(
          <ReactSway direction="left">
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <ReactSway direction="right">
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });
  });

  describe('edgeHoverScroll prop', () => {
    const waitForAnimationFrames = () => new Promise((resolve) => setTimeout(resolve, 50));

    type ViewportRect = Pick<DOMRect, 'bottom' | 'height' | 'left' | 'right' | 'top' | 'width' | 'x' | 'y'>;

    const setViewportRect = (element: HTMLElement, overrides: Partial<ViewportRect> = {}) => {
      const rect = {
        bottom: 300,
        height: 300,
        left: 0,
        right: 300,
        top: 0,
        width: 300,
        x: 0,
        y: 0,
        ...overrides,
      };

      Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: () => rect,
      });
    };

    it('keeps edge-hover auto-scroll idle away from boundaries', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientY: 150 });
      await waitForAnimationFrames();

      expect(onScroll).not.toHaveBeenCalled();
    });

    it('keeps edge-hover auto-scroll sleeping until a boundary is entered', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      await waitForAnimationFrames();
      expect(onScroll).not.toHaveBeenCalled();
    });

    it('scrolls vertical content from top and bottom edge hover zones', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientY: 10 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });

      onScroll.mockClear();
      fireEvent.pointerMove(viewport, { clientY: 290 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });
    });

    it('uses the visible viewport bottom when a vertical edge-hover stage extends below the fold', async () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(300);
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport, {
        bottom: 800,
        height: 800,
        top: 0,
      });

      fireEvent.pointerMove(viewport, { clientY: 290 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });
    });

    it('scrolls horizontal content from left and right edge hover zones', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientX: 10 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });

      onScroll.mockClear();
      fireEvent.pointerMove(viewport, { clientX: 290 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });
    });

    it('scrolls horizontal content from pointer edge-hover zones', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientX: 10 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });
    });

    it('exposes an imperative edge-hover route for external pointer ownership', async () => {
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} ref={ref} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      expect(ref.current?.handleEdgeHover({ clientX: 10, clientY: 150 })).toBe(true);

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });
    });

    it('uses only imperative input in external mode even when auto-scroll is disabled', async () => {
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway
          autoScroll={false}
          axis="horizontal"
          draggable={false}
          edgeHoverInputMode="external"
          edgeHoverScroll
          edgeHoverSize={40}
          onScroll={onScroll}
          ref={ref}
          speed={4}
        >
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientX: 10, clientY: 150 });
      await waitForAnimationFrames();
      expect(onScroll).not.toHaveBeenCalled();

      expect(ref.current?.handleEdgeHover({ clientX: 10, clientY: 150 })).toBe(true);
      await waitFor(() => expect(onScroll).toHaveBeenCalled());
    });

    it('keeps an external edge-hover lease alive across native pointer leave', async () => {
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} ref={ref} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      expect(ref.current?.handleEdgeHover({ clientX: 10, clientY: 150 })).toBe(true);
      await waitFor(() => expect(onScroll).toHaveBeenCalled());

      onScroll.mockClear();
      fireEvent.pointerLeave(viewport);
      await waitFor(() => expect(onScroll).toHaveBeenCalled());

      onScroll.mockClear();
      ref.current?.clearEdgeHover();
      await waitForAnimationFrames();
      expect(onScroll).not.toHaveBeenCalled();
    });

    it('applies a materially increasing velocity at each external edge-depth tier', () => {
      let nextFrameId = 1;
      const queuedFrames = new Map<number, FrameRequestCallback>();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        queuedFrames.set(frameId, callback);
        return frameId;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
        queuedFrames.delete(frameId);
      });

      const flushFrame = (timestamp: number) => {
        const currentFrame = [...queuedFrames.values()];
        queuedFrames.clear();
        act(() => {
          currentFrame.forEach((callback) => callback(timestamp));
        });
      };
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway
          autoScroll={false}
          axis="horizontal"
          draggable={false}
          edgeHoverInputMode="external"
          edgeHoverScroll
          edgeHoverSize={40}
          onScroll={onScroll}
          ref={ref}
          speed={1}
        >
          <div>Content</div>
        </ReactSway>
      );
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);
      flushFrame(0);

      let previousPosition = 0;
      const sampleDelta = (clientX: number, timestamp: number) => {
        expect(ref.current?.handleEdgeHover({ clientX, clientY: 150 })).toBe(true);
        flushFrame(timestamp);
        const nextPosition = onScroll.mock.lastCall?.[0] as number;
        const delta = Math.abs(nextPosition - previousPosition);
        previousPosition = nextPosition;
        return delta;
      };
      const shallowDelta = sampleDelta(268, 16.667);
      const midDelta = sampleDelta(280, 33.334);
      const physicalEdgeDelta = sampleDelta(300, 50.001);
      const beyondEdgeDelta = sampleDelta(340, 66.668);

      expect(shallowDelta).toBeGreaterThan(0);
      expect(midDelta).toBeGreaterThan(shallowDelta);
      expect(physicalEdgeDelta).toBeGreaterThan(midDelta);
      expect(physicalEdgeDelta).toBeCloseTo(3);
      expect(beyondEdgeDelta).toBeGreaterThan(physicalEdgeDelta * 1.9);
      expect(beyondEdgeDelta).toBeCloseTo(6);

      const callCountBeforeRelease = onScroll.mock.calls.length;
      ref.current?.clearEdgeHover();
      flushFrame(83.335);
      expect(onScroll).toHaveBeenCalledTimes(callCountBeforeRelease);
    });

    it('bounds frame-gap catch-up and excludes idle wall time on re-entry', () => {
      let nextFrameId = 1;
      const queuedFrames = new Map<number, FrameRequestCallback>();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        queuedFrames.set(frameId, callback);
        return frameId;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
        queuedFrames.delete(frameId);
      });

      const flushFrame = (timestamp: number) => {
        const currentFrame = [...queuedFrames.values()];
        queuedFrames.clear();
        act(() => {
          currentFrame.forEach((callback) => callback(timestamp));
        });
      };

      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway
          axis="horizontal"
          draggable={false}
          edgeHoverScroll
          edgeHoverSize={40}
          edgeHoverSpeedMultiplier={4}
          onScroll={onScroll}
          ref={ref}
          speed={1}
        >
          <div>Content</div>
        </ReactSway>
      );
      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      flushFrame(0);
      onScroll.mockClear();

      ref.current?.handleEdgeHover({ clientX: -40, clientY: 150 });
      flushFrame(16.667);
      expect(onScroll).toHaveBeenLastCalledWith(4);

      flushFrame(66.668);
      expect(onScroll).toHaveBeenLastCalledWith(8);

      ref.current?.handleEdgeHover({ clientX: 150, clientY: 150 });
      flushFrame(83.335);
      expect(onScroll).toHaveBeenCalledTimes(2);

      ref.current?.handleEdgeHover({ clientX: -40, clientY: 150 });
      flushFrame(10_000);
      expect(onScroll).toHaveBeenLastCalledWith(12);
    });

    it('rejects imperative edge-hover samples when edge-hover scrolling is disabled', async () => {
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway autoScroll={false} axis="horizontal" draggable={false} edgeHoverScroll={false} onScroll={onScroll} ref={ref} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      expect(ref.current?.handleEdgeHover({ clientX: 10, clientY: 150 })).toBe(false);

      await waitForAnimationFrames();
      expect(onScroll).not.toHaveBeenCalled();
    });

    it('rejects imperative edge-hover samples when no visible edge interval exists', () => {
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll ref={ref}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport, {
        left: 1100,
        right: 1200,
      });

      expect(ref.current?.handleEdgeHover({ clientX: 1110, clientY: 150 })).toBe(false);
    });

    it('stops edge-hover scrolling on pointer leave', async () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      fireEvent.pointerMove(viewport, { clientX: 10 });
      await waitFor(() => {
        expect(onScroll).toHaveBeenCalled();
      });

      onScroll.mockClear();
      fireEvent.pointerLeave(viewport);
      await waitForAnimationFrames();

      expect(onScroll).not.toHaveBeenCalled();
    });

    it('clears imperative edge-hover intensity', async () => {
      const onScroll = vi.fn();
      const ref = createRef<ReactSwayHandle>();
      const { container } = render(
        <ReactSway axis="horizontal" draggable={false} edgeHoverScroll edgeHoverSize={40} onScroll={onScroll} ref={ref} speed={4}>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container') as HTMLElement;
      const viewport = swayContainer.parentElement as HTMLElement;
      setViewportRect(viewport);

      ref.current?.handleEdgeHover({ clientX: 10, clientY: 150 });

      await waitFor(() => {
        expect(onScroll).toHaveBeenCalled();
      });

      onScroll.mockClear();
      ref.current?.clearEdgeHover();
      await waitForAnimationFrames();

      expect(onScroll).not.toHaveBeenCalled();
    });
  });

  describe('prefers-reduced-motion', () => {
    it('renders without error when reduced motion is preferred', () => {
      // Override matchMedia to return reduced motion
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })));

      expect(() => {
        render(
          <ReactSway>
            <div>Content</div>
          </ReactSway>
        );
      }).not.toThrow();
    });

    it('responds to dynamic media query changes', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          changeHandler = handler;
        }),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })));

      render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      // Simulate media query change to reduced motion
      expect(() => {
        act(() => {
          changeHandler?.({ matches: true } as MediaQueryListEvent);
        });
      }).not.toThrow();
    });

    it('removes reduced-motion listener on unmount', () => {
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();

      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        addEventListener,
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener,
        removeListener: vi.fn(),
      })));

      const { unmount } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
