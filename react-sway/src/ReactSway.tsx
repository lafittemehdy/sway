/**
 * Core ReactSway component implementing axis-aware infinite scrolling interactions.
 */
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Velocity applied per arrow key press (pixels). */
const ARROW_KEY_VELOCITY = 15;

/** Default edge-hover activation thickness in pixels. */
const DEFAULT_EDGE_HOVER_SIZE = 96;

/** Default friction coefficient applied to velocity each frame. */
const DEFAULT_FRICTION = 0.95;

/** Default IntersectionObserver rootMargin for lazy visibility detection. */
const DEFAULT_LAZY_ROOT_MARGIN = '100px';

/** Default IntersectionObserver threshold for lazy visibility detection. */
const DEFAULT_LAZY_THRESHOLD = 0.01;

/** Default delay in milliseconds before auto-scroll resumes after user interaction. */
const DEFAULT_RESUME_DELAY = 2000;

/** Default scroll speed in pixels per frame at 60fps. */
const DEFAULT_SPEED = 0.5;

/** Number of stacked content groups used to build the seamless loop. */
const MIN_LOOP_SEGMENTS = 3;

/** Maximum deltaTime cap to prevent physics instability during frame drops. */
const MAX_DELTA_TIME = 3;

/** Maximum allowed velocity magnitude to prevent runaway scrolling. */
const MAX_VELOCITY = 150;

/** Duration of a single frame at 60fps in milliseconds. */
const MS_PER_FRAME_60FPS = 16.667;

/** Speed multiplier when user prefers reduced motion (25% of normal). */
const REDUCED_MOTION_SPEED_FACTOR = 0.25;

/** Debounce delay in milliseconds for ResizeObserver callbacks. */
const RESIZE_DEBOUNCE_MS = 150;

/** Fallback pixel height for wheel events reported in line units. */
const WHEEL_LINE_HEIGHT_FALLBACK_PX = 16;

/** WheelEvent deltaMode value for line-based deltas. */
const WHEEL_MODE_LINE = 1;

/** WheelEvent deltaMode value for page-based deltas. */
const WHEEL_MODE_PAGE = 2;

/** Minimum pixel impulse for discrete wheel hardware reporting tiny pixel deltas. */
const WHEEL_PIXEL_MIN_DELTA_PX = 48;

/** Multiplier applied to wheel deltaY to convert to scroll velocity. */
const WHEEL_VELOCITY_MULTIPLIER = 0.14;

/** Small immediate wheel movement used to keep input responsive without jumping. */
const WHEEL_IMMEDIATE_DELTA_FACTOR = 0.14;

/** Legacy wheelDelta magnitude that usually represents one physical wheel notch. */
const WHEEL_LEGACY_NOTCH_DELTA = 120;

/** Minimum touch movement before a gesture is classified by axis. */
const TOUCH_AXIS_LOCK_THRESHOLD_PX = 8;

interface WheelEventWithLegacyDelta extends globalThis.WheelEvent {
  wheelDelta?: number;
  wheelDeltaY?: number;
}

export type SwayAxis = 'horizontal' | 'vertical';
export type SwayDirection = 'down' | 'left' | 'right' | 'up';
export type SwayWheelMode = 'axis' | 'capture';

type WheelDeltaAxis = 'x' | 'y';
type TouchInteractionState = 'active' | 'idle' | 'ignored' | 'pending';

function getLegacyWheelPixelDeltaY(event: globalThis.WheelEvent) {
  const { wheelDelta, wheelDeltaY } = event as WheelEventWithLegacyDelta;
  const legacyWheelDelta = typeof wheelDeltaY === 'number' ? wheelDeltaY : wheelDelta;

  if (typeof legacyWheelDelta !== 'number' || !Number.isFinite(legacyWheelDelta)) {
    return 0;
  }

  return -(legacyWheelDelta / WHEEL_LEGACY_NOTCH_DELTA) * WHEEL_PIXEL_MIN_DELTA_PX;
}

/**
 * Converts wheel deltas to pixels so mouse wheels, touchpads, and page-wheel
 * devices feed the same Sway velocity system.
 */
function normalizeWheelDelta(event: globalThis.WheelEvent, container: HTMLElement, axis: WheelDeltaAxis) {
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

function getOwnedWheelDelta(
  event: globalThis.WheelEvent,
  container: HTMLElement,
  isHorizontal: boolean,
  wheelMode: SwayWheelMode,
) {
  // The ownership function is intentionally partial: null means native scroll
  // chaining remains the browser's responsibility for cross-axis gestures.
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

function getVisibleEdgeInterval(rect: DOMRect, isHorizontal: boolean) {
  const rectEnd = isHorizontal ? rect.right : rect.bottom;
  const rectStart = isHorizontal ? rect.left : rect.top;
  const viewportEnd = isHorizontal ? window.innerWidth : window.innerHeight;

  const end = Math.min(rectEnd, viewportEnd);
  const start = Math.max(rectStart, 0);

  if (end <= start) return null;

  return {
    end,
    size: end - start,
    start,
  };
}

/**
 * Props for the ReactSway infinite scrolling component.
 */
export interface ReactSwayProps {
  /** Scroll axis. Horizontal directions imply `horizontal` when omitted. @default 'vertical' */
  axis?: SwayAxis;
  /** Enable/disable auto-scrolling. @default true */
  autoScroll?: boolean;
  /** Content elements to render in the infinite scroll container. */
  children: ReactNode;
  /** Auto-scroll direction. @default 'up' */
  direction?: SwayDirection;
  /** Enable mouse/touch drag interaction. @default true */
  draggable?: boolean;
  /** Only auto-scroll while the pointer hovers an axis boundary. @default false */
  edgeHoverScroll?: boolean;
  /** Edge-hover activation thickness in pixels. @default 96 */
  edgeHoverSize?: number;
  /** Momentum decay coefficient (0-1, lower = more friction). @default 0.95 */
  friction?: number;
  /** Enable keyboard controls (Space, Arrow keys, Home/End). @default true */
  keyboard?: boolean;
  /** Enable lazy visibility detection via IntersectionObserver. @default true */
  lazy?: boolean;
  /** IntersectionObserver rootMargin for lazy visibility detection. @default '100px' */
  lazyRootMargin?: string;
  /** IntersectionObserver threshold for lazy visibility detection. @default 0.01 */
  lazyThreshold?: number;
  /** Fired when scrolling pauses (user interaction or Space key). */
  onPause?: () => void;
  /** Fired when scrolling resumes after pause. */
  onResume?: () => void;
  /** Fired on every position change with the current scroll position. */
  onScroll?: (position: number) => void;
  /** Pause auto-scroll during user interaction. @default true */
  pauseOnInteraction?: boolean;
  /** Milliseconds before auto-scroll resumes after interaction. @default 2000 */
  resumeDelay?: number;
  /** Auto-scroll speed in pixels per frame at 60fps. @default 0.5 */
  speed?: number;
  /** Enable mouse wheel scrolling. @default true */
  wheelEnabled?: boolean;
  /**
   * Defines which wheel gestures ReactSway may cancel.
   *
   * `axis` only consumes wheel gestures aligned with the Sway axis, letting
   * cross-axis page scroll pass through. `capture` preserves legacy behavior
   * by consuming every wheel event that reaches the component.
   *
   * @default 'axis'
   */
  wheelMode?: SwayWheelMode;
}

/**
 * A smooth, infinite scrolling container component.
 *
 * Renders children in a continuously looping scroll area with support for
 * auto-scrolling, mouse drag, touch swipe, wheel, keyboard interactions,
 * and optional edge-hover scrolling.
 * Content is duplicated to create a seamless loop effect. Duplicate content
 * is wrapped in `<aside>` elements with `aria-hidden="true"` for accessibility.
 *
 * Respects `prefers-reduced-motion: reduce` by lowering auto-scroll speed
 * and disabling momentum effects.
 *
 * @example
 * ```tsx
 * <ReactSway direction="up" speed={1} friction={0.9}>
 *   <div className="content-item">Item 1</div>
 *   <div className="content-item">Item 2</div>
 * </ReactSway>
 * ```
 */
function ReactSway({
  axis,
  autoScroll = true,
  children,
  direction = 'up',
  draggable = true,
  edgeHoverScroll = false,
  edgeHoverSize = DEFAULT_EDGE_HOVER_SIZE,
  friction = DEFAULT_FRICTION,
  keyboard = true,
  lazy = true,
  lazyRootMargin = DEFAULT_LAZY_ROOT_MARGIN,
  lazyThreshold = DEFAULT_LAZY_THRESHOLD,
  onPause,
  onResume,
  onScroll,
  pauseOnInteraction = true,
  resumeDelay = DEFAULT_RESUME_DELAY,
  speed = DEFAULT_SPEED,
  wheelEnabled = true,
  wheelMode = 'axis',
}: ReactSwayProps) {
  const scrollAxis = useMemo<SwayAxis>(
    () => axis ?? (direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical'),
    [axis, direction],
  );
  const isHorizontal = scrollAxis === 'horizontal';
  const normalizedEdgeHoverSize = useMemo(
    () => (Number.isFinite(edgeHoverSize) ? Math.max(1, edgeHoverSize) : DEFAULT_EDGE_HOVER_SIZE),
    [edgeHoverSize],
  );
  const normalizedFriction = useMemo(
    () => (Number.isFinite(friction) ? Math.min(Math.max(friction, 0), 1) : DEFAULT_FRICTION),
    [friction],
  );
  const normalizedResumeDelay = useMemo(
    () => (Number.isFinite(resumeDelay) ? Math.max(0, resumeDelay) : DEFAULT_RESUME_DELAY),
    [resumeDelay],
  );
  const normalizedSpeed = useMemo(
    () => (Number.isFinite(speed) ? Math.max(0, speed) : DEFAULT_SPEED),
    [speed],
  );
  const touchAction = useMemo(() => {
    if (!draggable) return 'auto';
    return isHorizontal ? 'pan-y' : 'pan-x';
  }, [draggable, isHorizontal]);
  // Containment is sound only when ReactSway owns every wheel event it receives;
  // otherwise cross-axis and disabled-wheel page scroll must remain chainable.
  const overscrollBehavior = wheelEnabled && wheelMode === 'capture' ? 'contain' : 'auto';

  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [loopPoint, setLoopPoint] = useState(0);
  const [loopSegmentCount, setLoopSegmentCount] = useState(MIN_LOOP_SEGMENTS);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const animationFrameRef = useRef<number | null>(null);
  const autoScrollRef = useRef({ active: autoScroll, desired: autoScroll });
  const containerRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const lastTouchXRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const loopPointRef = useRef(0);
  const edgeHoverDirectionRef = useRef(0);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onScrollRef = useRef(onScroll);
  const originalGroupRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const resizeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchInteractionStateRef = useRef<TouchInteractionState>('idle');
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const velocityRef = useRef(0);

  // Keep callback refs in sync without triggering re-renders
  useEffect(() => {
    onPauseRef.current = onPause;
    onResumeRef.current = onResume;
    onScrollRef.current = onScroll;
  }, [onPause, onResume, onScroll]);

  // Listen for prefers-reduced-motion media query changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (!inactivityTimerRef.current) return;
    clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = null;
  }, []);

  const renderPosition = useCallback((rawPosition: number) => {
    if (!containerRef.current) return;
    const currentLoopPoint = loopPointRef.current;
    let visualPosition = rawPosition % (currentLoopPoint || 1);
    if (visualPosition > 0 && currentLoopPoint > 0) {
      visualPosition -= currentLoopPoint;
    }
    containerRef.current.style.transform = isHorizontal
      ? `translate3d(${visualPosition}px, 0, 0)`
      : `translate3d(0, ${visualPosition}px, 0)`;
  }, [isHorizontal]);

  const commitPosition = useCallback((nextPosition: number) => {
    if (positionRef.current === nextPosition) return;
    positionRef.current = nextPosition;
    renderPosition(nextPosition);
    onScrollRef.current?.(nextPosition);
  }, [renderPosition]);

  const wrapPosition = useCallback((rawPosition: number) => {
    const currentLoopPoint = loopPointRef.current;
    if (currentLoopPoint <= 0) return rawPosition;

    let wrappedPosition = rawPosition;
    while (wrappedPosition > 0) {
      wrappedPosition -= currentLoopPoint;
    }
    while (wrappedPosition < -currentLoopPoint * 2) {
      wrappedPosition += currentLoopPoint;
    }
    return wrappedPosition;
  }, []);

  const recalculateLoopPoint = useCallback(() => {
    if (!containerRef.current || !originalGroupRef.current) return;
    const originalContentSize = isHorizontal
      ? originalGroupRef.current.scrollWidth
      : originalGroupRef.current.scrollHeight;
    if (originalContentSize <= 0) return;

    const viewport = containerRef.current.parentElement ?? containerRef.current;
    const viewportSize = isHorizontal
      ? Math.max(viewport.clientWidth, 1)
      : Math.max(viewport.clientHeight, 1);
    const nextLoopSegmentCount = Math.max(MIN_LOOP_SEGMENTS, Math.ceil(viewportSize / originalContentSize) + 2);
    const nextLoopPoint = originalContentSize;

    setLoopSegmentCount((previousLoopSegmentCount) =>
      previousLoopSegmentCount === nextLoopSegmentCount ? previousLoopSegmentCount : nextLoopSegmentCount
    );
    loopPointRef.current = nextLoopPoint;
    setLoopPoint((previousLoopPoint) => (Math.abs(previousLoopPoint - nextLoopPoint) < 0.5 ? previousLoopPoint : nextLoopPoint));
    renderPosition(positionRef.current);
  }, [isHorizontal, renderPosition]);

  // Sync autoScroll prop changes with internal state
  useEffect(() => {
    autoScrollRef.current.desired = autoScroll;
    if (!autoScroll) {
      clearInactivityTimer();
      autoScrollRef.current.active = true;
    }
  }, [autoScroll, clearInactivityTimer]);

  // Sync loopPoint ref after state updates from observers/resizes
  useEffect(() => {
    loopPointRef.current = loopPoint;
    renderPosition(positionRef.current);
  }, [loopPoint, renderPosition]);

  // Dimension calculation
  useEffect(() => {
    // Use RAF to ensure layout is complete
    const rafId = requestAnimationFrame(recalculateLoopPoint);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [children, recalculateLoopPoint]);

  const pauseAutoScroll = useCallback(() => {
    if (!pauseOnInteraction) return;
    autoScrollRef.current.active = false;
    onPauseRef.current?.();
    clearInactivityTimer();
  }, [clearInactivityTimer, pauseOnInteraction]);

  const scheduleAutoScrollResume = useCallback(() => {
    if (!pauseOnInteraction || !autoScrollRef.current.desired || isPausedRef.current) return;
    clearInactivityTimer();

    inactivityTimerRef.current = setTimeout(() => {
      inactivityTimerRef.current = null;
      if (!autoScrollRef.current.desired || isPausedRef.current) return;
      autoScrollRef.current.active = true;
      onResumeRef.current?.();
    }, normalizedResumeDelay);
  }, [clearInactivityTimer, normalizedResumeDelay, pauseOnInteraction]);

  const togglePause = useCallback(() => {
    const newPaused = !isPausedRef.current;
    isPausedRef.current = newPaused;
    setIsPaused(newPaused);
    if (newPaused) {
      clearInactivityTimer();
      autoScrollRef.current.active = false;
      onPauseRef.current?.();
    } else {
      clearInactivityTimer();
      autoScrollRef.current.active = true;
      if (autoScrollRef.current.desired) {
        onResumeRef.current?.();
      }
    }
  }, [clearInactivityTimer]);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!keyboard) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case 'ArrowDown':
        if (isHorizontal) break;
        e.preventDefault();
        velocityRef.current -= ARROW_KEY_VELOCITY;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'ArrowUp':
        if (isHorizontal) break;
        e.preventDefault();
        velocityRef.current += ARROW_KEY_VELOCITY;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'ArrowLeft':
        if (!isHorizontal) break;
        e.preventDefault();
        velocityRef.current += ARROW_KEY_VELOCITY;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'ArrowRight':
        if (!isHorizontal) break;
        e.preventDefault();
        velocityRef.current -= ARROW_KEY_VELOCITY;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'End':
        e.preventDefault();
        if (loopPointRef.current > 0) {
          commitPosition(-loopPointRef.current);
        }
        velocityRef.current = 0;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'Home':
        e.preventDefault();
        commitPosition(0);
        velocityRef.current = 0;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      default:
        break;
    }
  }, [commitPosition, isHorizontal, keyboard, pauseAutoScroll, scheduleAutoScrollResume, togglePause]);

  const handleMouseDown = useCallback((e: globalThis.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    containerRef.current?.focus();
    setIsDragging(true);
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    lastMouseYRef.current = e.clientY;
    velocityRef.current = 0;
    pauseAutoScroll();
  }, [draggable, pauseAutoScroll]);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const delta = isHorizontal ? e.clientX - lastMouseXRef.current : e.clientY - lastMouseYRef.current;
    const nextPosition = wrapPosition(positionRef.current + delta);
    commitPosition(nextPosition);
    velocityRef.current = delta;
    lastMouseXRef.current = e.clientX;
    lastMouseYRef.current = e.clientY;
  }, [commitPosition, isHorizontal, wrapPosition]);

  const handleMouseUp = useCallback((e: globalThis.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    setIsDragging(false);
    isDraggingRef.current = false;
    scheduleAutoScrollResume();
  }, [scheduleAutoScrollResume]);

  const handleTouchEnd = useCallback((_e: globalThis.TouchEvent) => {
    const wasActive = touchInteractionStateRef.current === 'active';

    touchInteractionStateRef.current = 'idle';
    if (isDraggingRef.current) {
      setIsDragging(false);
      isDraggingRef.current = false;
    }

    if (wasActive) {
      scheduleAutoScrollResume();
    }
  }, [scheduleAutoScrollResume]);

  const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (touchInteractionStateRef.current === 'idle' || touchInteractionStateRef.current === 'ignored') return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];

    if (touchInteractionStateRef.current === 'pending') {
      const totalDeltaX = touch.clientX - touchStartXRef.current;
      const totalDeltaY = touch.clientY - touchStartYRef.current;
      const primaryDelta = isHorizontal ? Math.abs(totalDeltaX) : Math.abs(totalDeltaY);
      const crossDelta = isHorizontal ? Math.abs(totalDeltaY) : Math.abs(totalDeltaX);

      if (Math.max(primaryDelta, crossDelta) < TOUCH_AXIS_LOCK_THRESHOLD_PX) return;

      if (crossDelta > primaryDelta) {
        touchInteractionStateRef.current = 'ignored';
        return;
      }

      touchInteractionStateRef.current = 'active';
      setIsDragging(true);
      isDraggingRef.current = true;
      pauseAutoScroll();
    }

    e.preventDefault();
    const delta = isHorizontal ? touch.clientX - lastTouchXRef.current : touch.clientY - lastTouchYRef.current;
    const nextPosition = wrapPosition(positionRef.current + delta);
    commitPosition(nextPosition);
    velocityRef.current = delta;
    lastTouchXRef.current = touch.clientX;
    lastTouchYRef.current = touch.clientY;
  }, [commitPosition, isHorizontal, pauseAutoScroll, wrapPosition]);

  const handleTouchStart = useCallback((e: globalThis.TouchEvent) => {
    if (!draggable || e.touches.length !== 1) return;
    containerRef.current?.focus();
    touchInteractionStateRef.current = 'pending';
    lastTouchXRef.current = e.touches[0].clientX;
    lastTouchYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    velocityRef.current = 0;
  }, [draggable]);

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    if (!wheelEnabled) return;
    const currentContainer = e.currentTarget instanceof HTMLElement ? e.currentTarget : containerRef.current;
    if (!currentContainer) return;

    const ownedDelta = getOwnedWheelDelta(e, currentContainer, isHorizontal, wheelMode);
    if (ownedDelta === null) return;

    e.preventDefault();
    const wheelDelta = -ownedDelta;
    const nextPosition = wrapPosition(positionRef.current + wheelDelta * WHEEL_IMMEDIATE_DELTA_FACTOR);
    commitPosition(nextPosition);
    velocityRef.current += wheelDelta * WHEEL_VELOCITY_MULTIPLIER;
    velocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityRef.current));
    pauseAutoScroll();
    scheduleAutoScrollResume();
  }, [commitPosition, isHorizontal, pauseAutoScroll, scheduleAutoScrollResume, wheelEnabled, wheelMode, wrapPosition]);

  const handleEdgeHoverMove = useCallback((e: globalThis.MouseEvent) => {
    if (!edgeHoverScroll) return;
    const viewport = containerRef.current?.parentElement ?? containerRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const visibleInterval = getVisibleEdgeInterval(rect, isHorizontal);
    if (!visibleInterval) {
      edgeHoverDirectionRef.current = 0;
      return;
    }

    const pointerPosition = isHorizontal ? e.clientX : e.clientY;
    const effectiveEdgeHoverSize = Math.min(normalizedEdgeHoverSize, visibleInterval.size / 2);

    if (pointerPosition <= visibleInterval.start + effectiveEdgeHoverSize) {
      edgeHoverDirectionRef.current = 1;
      return;
    }

    if (pointerPosition >= visibleInterval.end - effectiveEdgeHoverSize) {
      edgeHoverDirectionRef.current = -1;
      return;
    }

    edgeHoverDirectionRef.current = 0;
  }, [edgeHoverScroll, isHorizontal, normalizedEdgeHoverSize]);

  const handleEdgeHoverLeave = useCallback(() => {
    edgeHoverDirectionRef.current = 0;
  }, []);

  // Event listener registration
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    if (draggable) {
      currentContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    if (wheelEnabled) {
      currentContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    const edgeHoverTarget = currentContainer.parentElement ?? currentContainer;
    edgeHoverTarget.addEventListener('mousemove', handleEdgeHoverMove);
    edgeHoverTarget.addEventListener('mouseleave', handleEdgeHoverLeave);

    return () => {
      currentContainer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (draggable) {
        currentContainer.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      }
      if (wheelEnabled) {
        currentContainer.removeEventListener('wheel', handleWheel);
      }
      edgeHoverTarget.removeEventListener('mousemove', handleEdgeHoverMove);
      edgeHoverTarget.removeEventListener('mouseleave', handleEdgeHoverLeave);
    };
  }, [draggable, handleEdgeHoverLeave, handleEdgeHoverMove, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove, handleTouchStart, handleWheel, wheelEnabled]);

  // Debounced resize handler shared by ResizeObserver and window resize fallback
  const debouncedRecalculate = useCallback(() => {
    if (resizeDebounceTimerRef.current) {
      clearTimeout(resizeDebounceTimerRef.current);
    }
    resizeDebounceTimerRef.current = setTimeout(() => {
      resizeDebounceTimerRef.current = null;
      recalculateLoopPoint();
    }, RESIZE_DEBOUNCE_MS);
  }, [recalculateLoopPoint]);

  // Resize listener fallback for browsers without ResizeObserver
  useEffect(() => {
    window.addEventListener('resize', debouncedRecalculate);

    return () => {
      window.removeEventListener('resize', debouncedRecalculate);
    };
  }, [debouncedRecalculate]);

  // ResizeObserver keeps loop measurements in sync with async content changes
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      debouncedRecalculate();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [debouncedRecalculate]);

  // Clean up resize debounce timer on unmount
  useEffect(() => {
    return () => {
      if (resizeDebounceTimerRef.current) {
        clearTimeout(resizeDebounceTimerRef.current);
        resizeDebounceTimerRef.current = null;
      }
    };
  }, []);

  // Tab visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
      if (!document.hidden) {
        lastFrameTimeRef.current = performance.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Clean up inactivity timer on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, [clearInactivityTimer]);

  // Animation loop
  useEffect(() => {
    if (!isTabActive || isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Reset so the first frame uses deltaTime=1 instead of a stale timestamp
    lastFrameTimeRef.current = 0;

    const directionMultiplier = direction === 'down' || direction === 'right' ? 1 : -1;

    const animate = (currentTime: number) => {
      let deltaTime = lastFrameTimeRef.current
        ? (currentTime - lastFrameTimeRef.current) / MS_PER_FRAME_60FPS
        : 1;
      deltaTime = Math.min(deltaTime, MAX_DELTA_TIME);
      lastFrameTimeRef.current = currentTime;

      // Apply velocity damping (skip momentum in reduced-motion mode)
      if (prefersReducedMotion) {
        velocityRef.current = 0;
      } else if (Math.abs(velocityRef.current) > 0.1) {
        velocityRef.current *= Math.pow(normalizedFriction, deltaTime);
      } else {
        velocityRef.current = 0;
      }

      let nextPosition = positionRef.current;

      // Calculate effective speed (reduced when user prefers reduced motion)
      const effectiveSpeed = prefersReducedMotion
        ? normalizedSpeed * REDUCED_MOTION_SPEED_FACTOR
        : normalizedSpeed;

      const edgeHoverMultiplier = edgeHoverScroll ? edgeHoverDirectionRef.current : directionMultiplier;

      // Auto-scroll when enabled and not dragging
      if (
        autoScrollRef.current.desired &&
        autoScrollRef.current.active &&
        !isDraggingRef.current &&
        (!edgeHoverScroll || edgeHoverMultiplier !== 0)
      ) {
        nextPosition += edgeHoverMultiplier * effectiveSpeed * deltaTime;
      }

      // Apply velocity momentum from user interaction
      if (!isDraggingRef.current && Math.abs(velocityRef.current) > 0.1) {
        nextPosition += velocityRef.current * deltaTime;
      }

      nextPosition = wrapPosition(nextPosition);
      commitPosition(nextPosition);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [commitPosition, direction, edgeHoverScroll, isHorizontal, isPaused, isTabActive, normalizedFriction, normalizedSpeed, prefersReducedMotion, wrapPosition]);

  // Intersection Observer for lazy visibility detection
  useEffect(() => {
    if (!lazy || !containerRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        root: null,
        rootMargin: lazyRootMargin,
        threshold: lazyThreshold,
      }
    );

    const items = containerRef.current.querySelectorAll('.content-item');
    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
      observer.disconnect();
    };
  }, [children, lazy, lazyRootMargin, lazyThreshold]);

  return (
    <div
      className="react-sway-container scroller-content"
      ref={containerRef}
      style={{
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        display: isHorizontal ? 'flex' : undefined,
        flexDirection: isHorizontal ? 'row' : undefined,
        height: isHorizontal ? '100%' : 'max-content',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        minHeight: isHorizontal ? undefined : '100%',
        overflow: 'hidden',
        overscrollBehavior,
        pointerEvents: 'auto',
        position: 'absolute',
        touchAction,
        transform: 'translate3d(0, 0, 0)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        width: isHorizontal ? 'max-content' : '100%',
        willChange: 'transform',
        zIndex: 1,
      }}
      onKeyDown={keyboard ? handleKeyDown : undefined}
      tabIndex={keyboard ? 0 : undefined}
    >
      <div className="content-group original" ref={originalGroupRef} style={isHorizontal ? { display: 'flex', flex: '0 0 auto' } : undefined}>
        {children}
      </div>
      {Array.from({ length: loopSegmentCount - 1 }, (_, duplicateIndex) => (
        <aside
          aria-hidden="true"
          className="content-group duplicate"
          data-duplicate="true"
          key={`duplicate-${duplicateIndex}`}
          role="presentation"
          style={isHorizontal ? { display: 'flex', flex: '0 0 auto' } : undefined}
        >
          {children}
        </aside>
      ))}
    </div>
  );
}

export default ReactSway;
