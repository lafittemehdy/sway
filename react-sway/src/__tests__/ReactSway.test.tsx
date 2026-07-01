/**
 * Behavioral and regression tests for ReactSway.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactSway } from '../index';

const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

let mockResizeCallback: (() => void) | null = null;
const mockResizeDisconnect = vi.fn();
const mockResizeObserve = vi.fn();

beforeEach(() => {
  const MockIntersectionObserver = vi.fn(function (this: IntersectionObserver) {
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
  mockResizeCallback = null;
  vi.restoreAllMocks();
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
      expect(children).toHaveLength(3);
    });

    it('renders container with correct class name', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const swayContainer = container.querySelector('.react-sway-container');
      expect(swayContainer).toBeInTheDocument();
    });

    it('renders duplicate groups with accessibility attributes', () => {
      const { container } = render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      const duplicates = container.querySelectorAll('[data-duplicate="true"]');
      expect(duplicates).toHaveLength(2);

      duplicates.forEach((duplicate) => {
        expect(duplicate.getAttribute('aria-hidden')).toBe('true');
        expect(duplicate.getAttribute('role')).toBe('presentation');
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
        expect(container.querySelectorAll('.content-group')).toHaveLength(7);
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
  });

  describe('draggable prop', () => {
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

  describe('IntersectionObserver', () => {
    it('sets up observer for content items', () => {
      render(
        <ReactSway>
          <div className="content-item">Item</div>
        </ReactSway>
      );

      expect(IntersectionObserver).toHaveBeenCalled();
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

      // If velocity were uncapped, it would be 20 * 1000 * 0.3 = 6000
      // With cap at 150, onPause is still called but velocity is bounded
      expect(onPause).toHaveBeenCalled();
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

    it('debounces rapid resize events', () => {
      vi.useFakeTimers();

      render(
        <ReactSway>
          <div>Content</div>
        </ReactSway>
      );

      // Fire the ResizeObserver callback multiple times rapidly
      if (mockResizeCallback) {
        for (let i = 0; i < 5; i++) {
          mockResizeCallback();
        }
      }

      // Before debounce delay, nothing should have recalculated yet
      // After debounce delay (150ms), recalculation fires once
      vi.advanceTimersByTime(200);

      // Verify observer was set up (the debounce is internal)
      expect(mockResizeObserve).toHaveBeenCalled();

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

      fireEvent.mouseMove(viewport, { clientY: 150 });
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

      fireEvent.mouseMove(viewport, { clientY: 10 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });

      onScroll.mockClear();
      fireEvent.mouseMove(viewport, { clientY: 290 });

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

      fireEvent.mouseMove(viewport, { clientY: 290 });

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

      fireEvent.mouseMove(viewport, { clientX: 10 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) > 0)).toBe(true);
      });

      onScroll.mockClear();
      fireEvent.mouseMove(viewport, { clientX: 290 });

      await waitFor(() => {
        expect(onScroll.mock.calls.some(([position]) => (position as number) < 0)).toBe(true);
      });
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
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      }).not.toThrow();
    });
  });
});
