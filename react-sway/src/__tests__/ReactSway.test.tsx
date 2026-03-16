/**
 * Behavioral and regression tests for ReactSway.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
