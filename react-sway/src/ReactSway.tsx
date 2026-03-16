import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

/** Number of stacked content groups used to build the seamless loop. */
const LOOP_SEGMENTS = 3;

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

/** Multiplier applied to wheel deltaY to convert to scroll velocity. */
const WHEEL_VELOCITY_MULTIPLIER = 0.3;

/**
 * Props for the ReactSway infinite scrolling component.
 */
export interface ReactSwayProps {
  /** Enable/disable auto-scrolling. @default true */
  autoScroll?: boolean;
  /** Content elements to render in the infinite scroll container. */
  children: ReactNode;
  /** Auto-scroll direction. @default 'up' */
  direction?: 'down' | 'up';
  /** Enable mouse/touch drag interaction. @default true */
  draggable?: boolean;
  /** Momentum decay coefficient (0-1, lower = more friction). @default 0.95 */
  friction?: number;
  /** Enable keyboard controls (Space, ArrowUp/Down, Home/End). @default true */
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
}

/**
 * A smooth, infinite scrolling container component.
 *
 * Renders children in a continuously looping scroll area with support for
 * auto-scrolling, mouse drag, touch swipe, wheel, and keyboard interactions.
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
  autoScroll = true,
  children,
  direction = 'up',
  draggable = true,
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
}: ReactSwayProps) {
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

  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [loopPoint, setLoopPoint] = useState(0);
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
  const lastMouseYRef = useRef(0);
  const lastTouchYRef = useRef(0);
  const loopPointRef = useRef(0);
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onScrollRef = useRef(onScroll);
  const positionRef = useRef(0);
  const resizeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    containerRef.current.style.transform = `translate3d(0, ${visualPosition}px, 0)`;
  }, []);

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
    if (!containerRef.current) return;
    const currentContentHeight = containerRef.current.scrollHeight;
    if (currentContentHeight <= 0) return;

    const nextLoopPoint = currentContentHeight / LOOP_SEGMENTS;
    loopPointRef.current = nextLoopPoint;
    setLoopPoint((previousLoopPoint) => (Math.abs(previousLoopPoint - nextLoopPoint) < 0.5 ? previousLoopPoint : nextLoopPoint));
    renderPosition(positionRef.current);
  }, [renderPosition]);

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
        e.preventDefault();
        velocityRef.current -= ARROW_KEY_VELOCITY;
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'ArrowUp':
        e.preventDefault();
        velocityRef.current += ARROW_KEY_VELOCITY;
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
  }, [commitPosition, keyboard, pauseAutoScroll, scheduleAutoScrollResume, togglePause]);

  const handleMouseDown = useCallback((e: globalThis.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    containerRef.current?.focus();
    setIsDragging(true);
    isDraggingRef.current = true;
    lastMouseYRef.current = e.clientY;
    velocityRef.current = 0;
    pauseAutoScroll();
  }, [draggable, pauseAutoScroll]);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const deltaY = e.clientY - lastMouseYRef.current;
    const nextPosition = wrapPosition(positionRef.current + deltaY);
    commitPosition(nextPosition);
    velocityRef.current = deltaY;
    lastMouseYRef.current = e.clientY;
  }, [commitPosition, wrapPosition]);

  const handleMouseUp = useCallback((e: globalThis.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    setIsDragging(false);
    isDraggingRef.current = false;
    scheduleAutoScrollResume();
  }, [scheduleAutoScrollResume]);

  const handleTouchEnd = useCallback((_e: globalThis.TouchEvent) => {
    if (!isDraggingRef.current) return;
    setIsDragging(false);
    isDraggingRef.current = false;
    scheduleAutoScrollResume();
  }, [scheduleAutoScrollResume]);

  const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touch.clientY - lastTouchYRef.current;
    const nextPosition = wrapPosition(positionRef.current + deltaY);
    commitPosition(nextPosition);
    velocityRef.current = deltaY;
    lastTouchYRef.current = touch.clientY;
  }, [commitPosition, wrapPosition]);

  const handleTouchStart = useCallback((e: globalThis.TouchEvent) => {
    if (!draggable || e.touches.length !== 1) return;
    containerRef.current?.focus();
    setIsDragging(true);
    isDraggingRef.current = true;
    lastTouchYRef.current = e.touches[0].clientY;
    velocityRef.current = 0;
    pauseAutoScroll();
  }, [draggable, pauseAutoScroll]);

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    if (!wheelEnabled) return;
    e.preventDefault();
    velocityRef.current -= e.deltaY * WHEEL_VELOCITY_MULTIPLIER;
    velocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityRef.current));
    pauseAutoScroll();
    scheduleAutoScrollResume();
  }, [pauseAutoScroll, scheduleAutoScrollResume, wheelEnabled]);

  // Event listener registration
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    currentContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    currentContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      currentContainer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      currentContainer.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      currentContainer.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove, handleTouchStart, handleWheel]);

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

    const directionMultiplier = direction === 'down' ? 1 : -1;

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

      // Auto-scroll when enabled and not dragging
      if (autoScrollRef.current.desired && autoScrollRef.current.active && !isDraggingRef.current) {
        nextPosition += directionMultiplier * effectiveSpeed * deltaTime;
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
  }, [commitPosition, direction, isPaused, isTabActive, normalizedFriction, normalizedSpeed, prefersReducedMotion, wrapPosition]);

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
        MozUserSelect: 'none',
        msUserSelect: 'none',
        overflow: 'hidden',
        overscrollBehavior: 'contain',
        pointerEvents: 'auto',
        position: 'absolute',
        touchAction: 'none',
        transform: 'translate3d(0, 0px, 0)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        width: '100%',
        willChange: 'transform',
        zIndex: 1,
      }}
      onKeyDown={keyboard ? handleKeyDown : undefined}
      tabIndex={keyboard ? 0 : undefined}
    >
      <div className="content-group original">
        {children}
      </div>
      <aside aria-hidden="true" className="content-group duplicate" data-duplicate="true" role="presentation">
        {children}
      </aside>
      <aside aria-hidden="true" className="content-group duplicate" data-duplicate="true" role="presentation">
        {children}
      </aside>
    </div>
  );
}

export default ReactSway;
