/**
 * Core ReactSway component implementing axis-aware infinite scrolling interactions.
 */
import {
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_EDGE_HOVER_SIZE,
  DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
  getEdgeHoverIntensity,
  getEdgeHoverVelocityScale,
  normalizeEdgeHoverIntensity,
  normalizeEdgeHoverSpeedMultiplier,
  type VisibleEdgeInterval,
} from './edge-hover-velocity';
import { getOwnedWheelDelta, type SwayWheelMode } from './wheel-input';

export type { SwayWheelMode } from './wheel-input';

/** Velocity applied per arrow key press (pixels). */
const ARROW_KEY_VELOCITY = 15;

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

/** Minimum stacked content groups needed to cover a seamless loop phase. */
const MIN_LOOP_SEGMENTS = 2;

/** Maximum deltaTime cap to prevent physics instability during frame drops. */
const MAX_DELTA_TIME = 3;

/** Edge-hover catch-up cap; larger jumps read as stalls followed by snapping. */
const MAX_EDGE_HOVER_DELTA_TIME = 1;

/** Maximum allowed velocity magnitude to prevent runaway scrolling. */
const MAX_VELOCITY = 150;

/** Duration of a single frame at 60fps in milliseconds. */
const MS_PER_FRAME_60FPS = 16.667;

/** Speed multiplier when user prefers reduced motion (25% of normal). */
const REDUCED_MOTION_SPEED_FACTOR = 0.25;

/** Multiplier applied to wheel deltaY to convert to scroll velocity. */
const WHEEL_VELOCITY_MULTIPLIER = 0.14;

/** Small immediate wheel movement used to keep input responsive without jumping. */
const WHEEL_IMMEDIATE_DELTA_FACTOR = 0.14;

/** Minimum touch movement before a gesture is classified by axis. */
const TOUCH_AXIS_LOCK_THRESHOLD_PX = 8;

export type SwayAxis = 'horizontal' | 'vertical';
export type SwayDirection = 'down' | 'left' | 'right' | 'up';
export type SwayEdgeHoverInputMode = 'external' | 'hybrid';
type SwayPointerLikeEvent = globalThis.MouseEvent | globalThis.PointerEvent;
type TouchInteractionState = 'active' | 'idle' | 'ignored' | 'pending';

interface EdgeHoverIntervalCache {
  interval: VisibleEdgeInterval | null;
  isHorizontal: boolean;
  viewport: HTMLElement;
}

interface LoopMeasurement {
  contentSize: number;
  isHorizontal: boolean;
  viewportSize: number;
}

export interface ReactSwayHandle {
  /**
   * Routes an external pointer sample through ReactSway's edge-hover policy.
   *
   * This is useful when another interaction owns pointer capture but still
   * wants ReactSway to keep its boundary scrolling semantics.
   * Returns true when an enabled, visible instance accepted the sample. A true
   * result does not imply motion when the pointer is in the inactive center.
   * The first accepted sample acquires an external-input lease that survives
   * native pointer leave; consumers must call `clearEdgeHover` on termination.
   */
  handleEdgeHover: (point: { clientX: number; clientY: number }) => boolean;
  /**
   * Routes an external wheel event through ReactSway's normalized wheel physics.
   *
   * Returns true when the event was consumed by ReactSway and false when the
   * current wheel policy leaves the event to native scroll chaining.
   */
  handleWheel: (event: globalThis.WheelEvent) => boolean;
  /** Releases external edge-hover ownership and clears active intensity. */
  clearEdgeHover: () => void;
}

function getVisibleEdgeInterval(rect: DOMRect, isHorizontal: boolean): VisibleEdgeInterval | null {
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
  /** Accessible name for the scrolling region. */
  ariaLabel?: string;
  /** Scroll axis. Horizontal directions imply `horizontal` when omitted. @default 'vertical' */
  axis?: SwayAxis;
  /** Enable/disable auto-scrolling. @default true */
  autoScroll?: boolean;
  /** Content elements to render in the infinite scroll container. */
  children: ReactNode;
  /** Additional class name applied to the semantic scrolling region. */
  className?: string;
  /** Auto-scroll direction. @default 'up' */
  direction?: SwayDirection;
  /** Enable mouse/touch drag interaction. @default true */
  draggable?: boolean;
  /**
   * Selects intrinsic pointer sensing plus the imperative bridge (`hybrid`),
   * or imperative external ownership only (`external`). @default 'hybrid'
   */
  edgeHoverInputMode?: SwayEdgeHoverInputMode;
  /**
   * Only auto-scroll while the pointer hovers an axis boundary. Active motion
   * preserves baseline speed, then accelerates toward the visible edge.
   * @default false
   */
  edgeHoverScroll?: boolean;
  /** Edge-hover activation thickness in pixels. @default 96 */
  edgeHoverSize?: number;
  /** Maximum edge-hover velocity relative to the baseline `speed`. @default 6 */
  edgeHoverSpeedMultiplier?: number;
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
  /** Baseline auto-scroll speed in pixels per frame at 60fps. @default 0.5 */
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
const ReactSway = forwardRef<ReactSwayHandle, ReactSwayProps>(function ReactSway({
  ariaLabel = 'Scrollable content',
  axis,
  autoScroll = true,
  children,
  className,
  direction = 'up',
  draggable = true,
  edgeHoverInputMode = 'hybrid',
  edgeHoverScroll = false,
  edgeHoverSize = DEFAULT_EDGE_HOVER_SIZE,
  edgeHoverSpeedMultiplier = DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
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
}: ReactSwayProps, ref) {
  const scrollAxis = useMemo<SwayAxis>(
    () => axis ?? (direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical'),
    [axis, direction],
  );
  const isHorizontal = scrollAxis === 'horizontal';
  const normalizedEdgeHoverSize = useMemo(
    () => (Number.isFinite(edgeHoverSize) ? Math.max(1, edgeHoverSize) : DEFAULT_EDGE_HOVER_SIZE),
    [edgeHoverSize],
  );
  const normalizedEdgeHoverSpeedMultiplier = useMemo(
    () => normalizeEdgeHoverSpeedMultiplier(edgeHoverSpeedMultiplier),
    [edgeHoverSpeedMultiplier],
  );
  const normalizedFriction = useMemo(
    () => (Number.isFinite(friction) ? Math.min(Math.max(friction, 0), 1) : DEFAULT_FRICTION),
    [friction],
  );
  const normalizedLazyThreshold = useMemo(
    () => (Number.isFinite(lazyThreshold)
      ? Math.min(Math.max(lazyThreshold, 0), 1)
      : DEFAULT_LAZY_THRESHOLD),
    [lazyThreshold],
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

  const [isPaused, setIsPaused] = useState(false);
  const [isTabActive, setIsTabActive] = useState(() => (
    typeof document === 'undefined' || !document.hidden
  ));
  const [loopSegmentCount, setLoopSegmentCount] = useState(MIN_LOOP_SEGMENTS);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const animationFrameRef = useRef<number | null>(null);
  const animationLoopRef = useRef<((currentTime: number) => void) | null>(null);
  const autoScrollRef = useRef({ active: autoScroll, desired: autoScroll });
  const containerRef = useRef<HTMLElement>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const lastTouchXRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const loopPointRef = useRef(0);
  const edgeHoverIntervalCacheFrameRef = useRef<number | null>(null);
  const edgeHoverIntervalCacheRef = useRef<EdgeHoverIntervalCache | null>(null);
  const edgeHoverIntensityRef = useRef(0);
  const externalEdgeHoverLeaseRef = useRef(false);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onScrollRef = useRef(onScroll);
  const originalGroupRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const loopMeasurementFrameRef = useRef<number | null>(null);
  const lastLoopMeasurementRef = useRef<LoopMeasurement | null>(null);
  const mouseDragListenerCleanupRef = useRef<(() => void) | null>(null);
  const touchDragListenerCleanupRef = useRef<(() => void) | null>(null);
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

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null || !animationLoopRef.current) return;
    animationFrameRef.current = requestAnimationFrame(animationLoopRef.current);
  }, []);

  const clearEdgeHoverIntervalCache = useCallback(() => {
    edgeHoverIntervalCacheRef.current = null;

    if (edgeHoverIntervalCacheFrameRef.current !== null) {
      cancelAnimationFrame(edgeHoverIntervalCacheFrameRef.current);
      edgeHoverIntervalCacheFrameRef.current = null;
    }
  }, []);

  const readVisibleEdgeInterval = useCallback((viewport: HTMLElement) => {
    const cachedInterval = edgeHoverIntervalCacheRef.current;

    if (
      cachedInterval &&
      cachedInterval.viewport === viewport &&
      cachedInterval.isHorizontal === isHorizontal
    ) {
      return cachedInterval.interval;
    }

    const interval = getVisibleEdgeInterval(viewport.getBoundingClientRect(), isHorizontal);
    edgeHoverIntervalCacheRef.current = { interval, isHorizontal, viewport };

    if (edgeHoverIntervalCacheFrameRef.current === null) {
      edgeHoverIntervalCacheFrameRef.current = requestAnimationFrame(() => {
        edgeHoverIntervalCacheFrameRef.current = null;
        edgeHoverIntervalCacheRef.current = null;
      });
    }

    return interval;
  }, [isHorizontal]);

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

    if (rawPosition <= 0 && rawPosition >= -currentLoopPoint * 2) return rawPosition;

    let wrappedPosition = rawPosition % currentLoopPoint;
    if (wrappedPosition > 0) wrappedPosition -= currentLoopPoint;
    return wrappedPosition;
  }, []);

  const setDraggingState = useCallback((nextIsDragging: boolean) => {
    isDraggingRef.current = nextIsDragging;

    if (containerRef.current && draggable) {
      containerRef.current.style.cursor = nextIsDragging ? 'grabbing' : 'grab';
    }
  }, [draggable]);

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
    const nextLoopSegmentCount = Math.max(MIN_LOOP_SEGMENTS, Math.ceil(viewportSize / originalContentSize) + 1);
    const nextLoopPoint = originalContentSize;
    const previousMeasurement = lastLoopMeasurementRef.current;
    const nextMeasurement = {
      contentSize: originalContentSize,
      isHorizontal,
      viewportSize,
    };

    if (
      previousMeasurement?.contentSize === nextMeasurement.contentSize &&
      previousMeasurement.isHorizontal === nextMeasurement.isHorizontal &&
      previousMeasurement.viewportSize === nextMeasurement.viewportSize
    ) {
      return;
    }

    lastLoopMeasurementRef.current = nextMeasurement;
    setLoopSegmentCount((previousLoopSegmentCount) =>
      previousLoopSegmentCount === nextLoopSegmentCount ? previousLoopSegmentCount : nextLoopSegmentCount
    );
    loopPointRef.current = nextLoopPoint;
    renderPosition(positionRef.current);
  }, [isHorizontal, renderPosition]);

  // Sync autoScroll prop changes with internal state
  useEffect(() => {
    autoScrollRef.current.desired = autoScroll;
    if (!autoScroll) {
      clearInactivityTimer();
      autoScrollRef.current.active = true;
    } else {
      startAnimationLoop();
    }
  }, [autoScroll, clearInactivityTimer, startAnimationLoop]);

  const scheduleLoopPointRecalculation = useCallback(() => {
    clearEdgeHoverIntervalCache();

    if (loopMeasurementFrameRef.current !== null) return;

    loopMeasurementFrameRef.current = requestAnimationFrame(() => {
      loopMeasurementFrameRef.current = null;
      recalculateLoopPoint();
    });
  }, [clearEdgeHoverIntervalCache, recalculateLoopPoint]);

  // Dimension calculation
  useEffect(() => {
    lastLoopMeasurementRef.current = null;
    scheduleLoopPointRecalculation();
  }, [children, isHorizontal, scheduleLoopPointRecalculation]);

  const pauseAutoScroll = useCallback(() => {
    if (
      !pauseOnInteraction ||
      !autoScrollRef.current.desired ||
      !autoScrollRef.current.active
    ) return;
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
      startAnimationLoop();
    }, normalizedResumeDelay);
  }, [clearInactivityTimer, normalizedResumeDelay, pauseOnInteraction, startAnimationLoop]);

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
      startAnimationLoop();
    }
  }, [clearInactivityTimer, startAnimationLoop]);

  const setEdgeHoverIntensity = useCallback((nextIntensityValue: number) => {
    const nextIntensity = normalizeEdgeHoverIntensity(nextIntensityValue);
    edgeHoverIntensityRef.current = nextIntensity;

    if (nextIntensity !== 0) {
      startAnimationLoop();
    }
  }, [startAnimationLoop]);

  const detachMouseDragListeners = useCallback(() => {
    mouseDragListenerCleanupRef.current?.();
    mouseDragListenerCleanupRef.current = null;
  }, []);

  const detachTouchDragListeners = useCallback(() => {
    touchDragListenerCleanupRef.current?.();
    touchDragListenerCleanupRef.current = null;
  }, []);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLElement>) => {
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
    startAnimationLoop();
  }, [commitPosition, isHorizontal, keyboard, pauseAutoScroll, scheduleAutoScrollResume, startAnimationLoop, togglePause]);

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
    setDraggingState(false);
    detachMouseDragListeners();
    scheduleAutoScrollResume();
    startAnimationLoop();
  }, [detachMouseDragListeners, scheduleAutoScrollResume, setDraggingState, startAnimationLoop]);

  const handleMouseCancel = useCallback(() => {
    if (!isDraggingRef.current) return;
    setDraggingState(false);
    detachMouseDragListeners();
    scheduleAutoScrollResume();
    startAnimationLoop();
  }, [detachMouseDragListeners, scheduleAutoScrollResume, setDraggingState, startAnimationLoop]);

  const attachMouseDragListeners = useCallback(() => {
    detachMouseDragListeners();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseCancel);
    mouseDragListenerCleanupRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseCancel);
    };
  }, [detachMouseDragListeners, handleMouseCancel, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e: globalThis.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    containerRef.current?.focus();
    setDraggingState(true);
    lastMouseXRef.current = e.clientX;
    lastMouseYRef.current = e.clientY;
    velocityRef.current = 0;
    pauseAutoScroll();
    attachMouseDragListeners();
    startAnimationLoop();
  }, [attachMouseDragListeners, draggable, pauseAutoScroll, setDraggingState, startAnimationLoop]);

  const handleTouchEnd = useCallback((_e: globalThis.TouchEvent) => {
    const wasActive = touchInteractionStateRef.current === 'active';

    touchInteractionStateRef.current = 'idle';
    detachTouchDragListeners();
    if (isDraggingRef.current) {
      setDraggingState(false);
    }

    if (wasActive) {
      scheduleAutoScrollResume();
      startAnimationLoop();
    }
  }, [detachTouchDragListeners, scheduleAutoScrollResume, setDraggingState, startAnimationLoop]);

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
      setDraggingState(true);
      pauseAutoScroll();
    }

    e.preventDefault();
    const delta = isHorizontal ? touch.clientX - lastTouchXRef.current : touch.clientY - lastTouchYRef.current;
    const nextPosition = wrapPosition(positionRef.current + delta);
    commitPosition(nextPosition);
    velocityRef.current = delta;
    lastTouchXRef.current = touch.clientX;
    lastTouchYRef.current = touch.clientY;
  }, [commitPosition, isHorizontal, pauseAutoScroll, setDraggingState, wrapPosition]);

  const attachTouchDragListeners = useCallback(() => {
    detachTouchDragListeners();
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    touchDragListenerCleanupRef.current = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [detachTouchDragListeners, handleTouchEnd, handleTouchMove]);

  const handleTouchStart = useCallback((e: globalThis.TouchEvent) => {
    if (!draggable || e.touches.length !== 1) return;
    containerRef.current?.focus();
    touchInteractionStateRef.current = 'pending';
    lastTouchXRef.current = e.touches[0].clientX;
    lastTouchYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    velocityRef.current = 0;
    attachTouchDragListeners();
  }, [attachTouchDragListeners, draggable]);

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    if (!wheelEnabled) return false;
    const currentContainer = e.currentTarget instanceof HTMLElement ? e.currentTarget : containerRef.current;
    if (!currentContainer) return false;

    const ownedDelta = getOwnedWheelDelta(e, currentContainer, isHorizontal, wheelMode);
    if (ownedDelta === null) return false;

    e.preventDefault();
    const wheelDelta = -ownedDelta;
    const nextPosition = wrapPosition(positionRef.current + wheelDelta * WHEEL_IMMEDIATE_DELTA_FACTOR);
    commitPosition(nextPosition);
    velocityRef.current += wheelDelta * WHEEL_VELOCITY_MULTIPLIER;
    velocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityRef.current));
    pauseAutoScroll();
    scheduleAutoScrollResume();
    startAnimationLoop();
    return true;
  }, [commitPosition, isHorizontal, pauseAutoScroll, scheduleAutoScrollResume, startAnimationLoop, wheelEnabled, wheelMode, wrapPosition]);

  const applyEdgeHoverPoint = useCallback((point: { clientX: number; clientY: number }) => {
    if (!edgeHoverScroll) return false;
    const viewport = containerRef.current?.parentElement ?? containerRef.current;
    if (!viewport) return false;

    const visibleInterval = readVisibleEdgeInterval(viewport);
    if (!visibleInterval) {
      setEdgeHoverIntensity(0);
      return false;
    }

    const pointerPosition = isHorizontal ? point.clientX : point.clientY;
    const nextIntensity = getEdgeHoverIntensity(
      pointerPosition,
      visibleInterval,
      normalizedEdgeHoverSize,
    );
    setEdgeHoverIntensity(nextIntensity);
    return true;
  }, [edgeHoverScroll, isHorizontal, normalizedEdgeHoverSize, readVisibleEdgeInterval, setEdgeHoverIntensity]);

  const handleEdgeHover = useCallback((point: { clientX: number; clientY: number }) => {
    const accepted = applyEdgeHoverPoint(point);
    externalEdgeHoverLeaseRef.current = accepted;
    return accepted;
  }, [applyEdgeHoverPoint]);

  const clearEdgeHover = useCallback(() => {
    externalEdgeHoverLeaseRef.current = false;
    setEdgeHoverIntensity(0);
  }, [setEdgeHoverIntensity]);

  useImperativeHandle(ref, () => ({
    clearEdgeHover,
    handleEdgeHover,
    handleWheel,
  }), [clearEdgeHover, handleEdgeHover, handleWheel]);

  const handleEdgeHoverMove = useCallback((e: SwayPointerLikeEvent) => {
    if (externalEdgeHoverLeaseRef.current) return;
    applyEdgeHoverPoint(e);
  }, [applyEdgeHoverPoint]);

  const handleEdgeHoverLeave = useCallback(() => {
    if (externalEdgeHoverLeaseRef.current) return;
    setEdgeHoverIntensity(0);
  }, [setEdgeHoverIntensity]);

  // Event listener registration
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    if (draggable) {
      currentContainer.addEventListener('mousedown', handleMouseDown);
      currentContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    if (wheelEnabled) {
      currentContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    const edgeHoverTarget = currentContainer.parentElement ?? currentContainer;
    const usesPointerEdgeHover = typeof window.PointerEvent === 'function';

    const usesNativeEdgeHover = edgeHoverScroll && edgeHoverInputMode === 'hybrid';

    if (usesNativeEdgeHover && usesPointerEdgeHover) {
      edgeHoverTarget.addEventListener('pointermove', handleEdgeHoverMove);
      edgeHoverTarget.addEventListener('pointerleave', handleEdgeHoverLeave);
      edgeHoverTarget.addEventListener('pointercancel', clearEdgeHover);
    } else if (usesNativeEdgeHover) {
      edgeHoverTarget.addEventListener('mousemove', handleEdgeHoverMove);
      edgeHoverTarget.addEventListener('mouseleave', handleEdgeHoverLeave);
    }

    return () => {
      if (draggable) {
        currentContainer.removeEventListener('mousedown', handleMouseDown);
        currentContainer.removeEventListener('touchstart', handleTouchStart);
      }
      if (wheelEnabled) {
        currentContainer.removeEventListener('wheel', handleWheel);
      }
      if (usesNativeEdgeHover && usesPointerEdgeHover) {
        edgeHoverTarget.removeEventListener('pointermove', handleEdgeHoverMove);
        edgeHoverTarget.removeEventListener('pointerleave', handleEdgeHoverLeave);
        edgeHoverTarget.removeEventListener('pointercancel', clearEdgeHover);
      } else if (usesNativeEdgeHover) {
        edgeHoverTarget.removeEventListener('mousemove', handleEdgeHoverMove);
        edgeHoverTarget.removeEventListener('mouseleave', handleEdgeHoverLeave);
      }
      detachMouseDragListeners();
      detachTouchDragListeners();
    };
  }, [
    detachMouseDragListeners,
    detachTouchDragListeners,
    draggable,
    edgeHoverScroll,
    edgeHoverInputMode,
    clearEdgeHover,
    handleEdgeHoverLeave,
    handleEdgeHoverMove,
    handleMouseDown,
    handleTouchStart,
    handleWheel,
    wheelEnabled,
  ]);

  // Resize listener fallback for browsers without ResizeObserver
  useEffect(() => {
    window.addEventListener('resize', scheduleLoopPointRecalculation);

    return () => {
      window.removeEventListener('resize', scheduleLoopPointRecalculation);
    };
  }, [scheduleLoopPointRecalculation]);

  // ResizeObserver keeps loop measurements in sync with async content changes
  useEffect(() => {
    if (!containerRef.current || !originalGroupRef.current || typeof ResizeObserver === 'undefined') return;

    const currentContainer = containerRef.current;
    const originalGroup = originalGroupRef.current;
    const viewport = currentContainer.parentElement ?? currentContainer;

    const observer = new ResizeObserver(() => {
      scheduleLoopPointRecalculation();
    });
    observer.observe(originalGroup);

    if (viewport !== originalGroup) {
      observer.observe(viewport);
    }

    return () => {
      observer.disconnect();
    };
  }, [scheduleLoopPointRecalculation]);

  // Clean up deferred measurement work on unmount
  useEffect(() => {
    return () => {
      if (loopMeasurementFrameRef.current !== null) {
        cancelAnimationFrame(loopMeasurementFrameRef.current);
        loopMeasurementFrameRef.current = null;
      }
      clearEdgeHoverIntervalCache();
    };
  }, [clearEdgeHoverIntervalCache]);

  // Tab visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
      if (!document.hidden) {
        lastFrameTimeRef.current = performance.now();
        startAnimationLoop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startAnimationLoop]);

  // Clean up inactivity timer on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, [clearInactivityTimer]);

  // Animation loop
  useEffect(() => {
    if (!isTabActive || isPaused) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      animationLoopRef.current = null;
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

      const edgeHoverMultiplier = edgeHoverScroll
        ? getEdgeHoverVelocityScale(
          edgeHoverIntensityRef.current,
          normalizedEdgeHoverSpeedMultiplier,
        )
        : directionMultiplier;

      const shouldAutoScroll =
        ((autoScrollRef.current.desired && autoScrollRef.current.active) ||
          externalEdgeHoverLeaseRef.current) &&
        !isDraggingRef.current &&
        (!edgeHoverScroll || edgeHoverMultiplier !== 0);

      // Auto-scroll when enabled and not dragging
      if (shouldAutoScroll) {
        const autoScrollDeltaTime = edgeHoverScroll
          ? Math.min(deltaTime, MAX_EDGE_HOVER_DELTA_TIME)
          : deltaTime;
        nextPosition += edgeHoverMultiplier * effectiveSpeed * autoScrollDeltaTime;
      }

      const shouldApplyMomentum = !isDraggingRef.current && Math.abs(velocityRef.current) > 0.1;

      // Apply velocity momentum from user interaction
      if (shouldApplyMomentum) {
        nextPosition += velocityRef.current * deltaTime;
      }

      nextPosition = wrapPosition(nextPosition);
      commitPosition(nextPosition);

      if (isDraggingRef.current || shouldAutoScroll || shouldApplyMomentum) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      animationFrameRef.current = null;
      // A later edge re-entry starts a new temporal segment. Resetting the
      // timestamp prevents idle wall time from becoming a capped 3-frame jump.
      lastFrameTimeRef.current = 0;
    };

    animationLoopRef.current = animate;
    startAnimationLoop();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (animationLoopRef.current === animate) {
        animationLoopRef.current = null;
      }
    };
  }, [
    commitPosition,
    direction,
    edgeHoverScroll,
    isPaused,
    isTabActive,
    normalizedFriction,
    normalizedEdgeHoverSpeedMultiplier,
    normalizedSpeed,
    prefersReducedMotion,
    startAnimationLoop,
    wrapPosition,
  ]);

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
        threshold: normalizedLazyThreshold,
      }
    );

    const items = containerRef.current.querySelectorAll('.content-item');
    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
      observer.disconnect();
    };
  }, [children, lazy, lazyRootMargin, normalizedLazyThreshold]);

  return (
    <section
      aria-label={ariaLabel}
      className={`react-sway-container scroller-content${className ? ` ${className}` : ''}`}
      ref={containerRef}
      style={{
        cursor: draggable ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default',
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
          inert
          key={`duplicate-${duplicateIndex}`}
          role="presentation"
          style={isHorizontal
            ? { display: 'flex', flex: '0 0 auto', pointerEvents: 'none' }
            : { pointerEvents: 'none' }}
        >
          {children}
        </aside>
      ))}
    </section>
  );
});

export default ReactSway;
