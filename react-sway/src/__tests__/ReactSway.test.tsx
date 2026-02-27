/**
 * Behavioral and regression tests for ReactSway.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactSway } from '../index';

const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

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
});

afterEach(() => {
  cleanup();
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
  });
});
