import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

// Constants (hardcoded as per current plan)
const SCROLL_SPEED = 0.5; // pixels per frame at 60fps
const INACTIVITY_DELAY = 2000; // ms
const FRICTION = 0.95;
const MAX_DELTA_TIME = 3; // Cap deltaTime to prevent physics breaking

interface ReactSwayProps {
  children: ReactNode;
}

function ReactSway({ children }: ReactSwayProps) {
  const [position, setPosition] = useState(0);
  const [, setVelocity] = useState(0); // velocity is set but never used directly for rendering, only for physics calcs
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);

  // Content dimensions
  const [contentHeight, setContentHeight] = useState(0);
  const [loopPoint, setLoopPoint] = useState(0);
  const [, setContainerHeight] = useState(0); // containerHeight is set but never used

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchYRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  // Visual position calculation
  let visualPosition = position % (loopPoint || 1);
  if (visualPosition > 0 && loopPoint > 0) visualPosition -= loopPoint;

  useEffect(() => {
    const calculateDimensions = () => {
      if (containerRef.current) {
        // Force a reflow to ensure accurate measurements
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        containerRef.current.offsetHeight;

        const currentContentHeight = containerRef.current.scrollHeight;
        const calculatedLoopPoint = currentContentHeight / 3;

        console.log('Calculating dimensions:', { currentContentHeight, calculatedLoopPoint });

        if (currentContentHeight > 0) {
          setContentHeight(currentContentHeight);
          setLoopPoint(calculatedLoopPoint);
        }

        setContainerHeight(window.innerHeight);
      }
    };

    // Use RAF to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      calculateDimensions();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [children]);

  const pauseAutoScroll = useCallback(() => {
    setAutoScrollEnabled(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, []);

  const scheduleAutoScrollResume = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setAutoScrollEnabled(true);
    }, INACTIVITY_DELAY);
  }, []);

  const handleMouseDown = useCallback((e: globalThis.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastMouseYRef.current = e.clientY;
    setVelocity(0);
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaY = e.clientY - lastMouseYRef.current;
    setPosition(prev => prev + deltaY);
    setVelocity(deltaY);
    lastMouseYRef.current = e.clientY;
  }, [isDragging]);

  const handleMouseUp = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    scheduleAutoScrollResume();
  }, [isDragging, scheduleAutoScrollResume]);

  const handleTouchStart = useCallback((e: globalThis.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      lastTouchYRef.current = e.touches[0].clientY;
      setVelocity(0);
      pauseAutoScroll();
    }
  }, [pauseAutoScroll]);

  const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touch.clientY - lastTouchYRef.current;
    setPosition(prev => prev + deltaY);
    setVelocity(deltaY);
    lastTouchYRef.current = touch.clientY;
  }, [isDragging]);

  const handleTouchEnd = useCallback((_e: globalThis.TouchEvent) => { // e is not used
    if (!isDragging) return;
    setIsDragging(false);
    scheduleAutoScrollResume();
  }, [isDragging, scheduleAutoScrollResume]);

  const handleWheel = useCallback((e: globalThis.WheelEvent) => {
    e.preventDefault();
    setVelocity(prev => prev - e.deltaY * 0.3);
    pauseAutoScroll();
    scheduleAutoScrollResume();
  }, [pauseAutoScroll, scheduleAutoScrollResume]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newPausedState = !prev;
      if (newPausedState) {
        pauseAutoScroll();
      } else {
        setAutoScrollEnabled(true);
      }
      return newPausedState;
    });
  }, [pauseAutoScroll]);

  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVelocity(prev => prev + 15);
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVelocity(prev => prev - 15);
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'Home':
        e.preventDefault();
        setPosition(0);
        setVelocity(0);
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      case 'End':
        e.preventDefault();
        if (loopPoint > 0) {
          setPosition(-loopPoint);
        }
        setVelocity(0);
        pauseAutoScroll();
        scheduleAutoScrollResume();
        break;
      default:
        break;
    }
  }, [togglePause, pauseAutoScroll, scheduleAutoScrollResume, loopPoint]);

  const handleResize = useCallback(() => {
    setContainerHeight(window.innerHeight);
    if (containerRef.current) {
      const currentContentHeight = containerRef.current.scrollHeight;
      setContentHeight(currentContentHeight);
      setLoopPoint(currentContentHeight / 3);
    }
  }, []);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Create bound event handlers that maintain proper context
    const boundHandlers = {
      mouseDown: handleMouseDown,
      mouseMove: handleMouseMove,
      mouseUp: handleMouseUp,
      touchStart: handleTouchStart,
      touchMove: handleTouchMove,
      touchEnd: handleTouchEnd,
      wheel: handleWheel
    };

    // Add event listeners
    currentContainer.addEventListener('mousedown', boundHandlers.mouseDown);
    window.addEventListener('mousemove', boundHandlers.mouseMove);
    window.addEventListener('mouseup', boundHandlers.mouseUp);
    currentContainer.addEventListener('touchstart', boundHandlers.touchStart, { passive: true });
    window.addEventListener('touchmove', boundHandlers.touchMove, { passive: false });
    window.addEventListener('touchend', boundHandlers.touchEnd, { passive: true });
    currentContainer.addEventListener('wheel', boundHandlers.wheel, { passive: false });

    return () => {
      currentContainer.removeEventListener('mousedown', boundHandlers.mouseDown);
      window.removeEventListener('mousemove', boundHandlers.mouseMove);
      window.removeEventListener('mouseup', boundHandlers.mouseUp);
      currentContainer.removeEventListener('touchstart', boundHandlers.touchStart);
      window.removeEventListener('touchmove', boundHandlers.touchMove);
      window.removeEventListener('touchend', boundHandlers.touchEnd);
      currentContainer.removeEventListener('wheel', boundHandlers.wheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleKeyDown, handleResize]);

  // Tab Visibility Handling
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

  // Animation Loop
  useEffect(() => {
    if (!isTabActive || isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      let deltaTime = lastFrameTimeRef.current ? (currentTime - lastFrameTimeRef.current) / 16.667 : 1;
      deltaTime = Math.min(deltaTime, MAX_DELTA_TIME);
      lastFrameTimeRef.current = currentTime;

      setPosition(prevPosition => {
        let newPosition = prevPosition;

        // Auto-scroll when enabled
        if (autoScrollEnabled && !isDragging && !isPaused) {
          newPosition -= SCROLL_SPEED * deltaTime;
        }

        return newPosition;
      });

      setVelocity(prevVelocity => {
        let newVelocity = prevVelocity;

        if (Math.abs(newVelocity) > 0.1) {
          if (!isDragging) {
            setPosition(prev => prev + newVelocity * deltaTime);
          }
          newVelocity *= Math.pow(FRICTION, deltaTime);
        } else {
          newVelocity = 0;
        }

        return newVelocity;
      });

      // Handle position wrapping
      setPosition(prevPosition => {
        let newPosition = prevPosition;

        if (loopPoint > 0) {
          while (newPosition > 0) {
            newPosition -= loopPoint;
          }
          while (newPosition < -loopPoint * 2) {
            newPosition += loopPoint;
          }
        }

        return newPosition;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTabActive, autoScrollEnabled, isDragging, isPaused, loopPoint]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!containerRef.current) return;

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
        rootMargin: '100px',
        threshold: 0.01,
      }
    );

    const items = containerRef.current.querySelectorAll('.content-item');
    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
      observer.disconnect();
    };
  }, [children, contentHeight]);

  // Apply styles to override conflicting CSS
  useEffect(() => {
    const originalBodyStyle = {
      touchAction: document.body.style.touchAction,
      overflow: document.body.style.overflow
    };

    // Override body styles that might conflict
    document.body.style.touchAction = 'none';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore original styles
      document.body.style.touchAction = originalBodyStyle.touchAction;
      document.body.style.overflow = originalBodyStyle.overflow;
    };
  }, []);

  return (
    <div
      className="react-sway-container scroller-content"
      ref={containerRef}
      style={{
        transform: `translate3d(0, ${visualPosition}px, 0)`,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'absolute',
        width: '100%',
        willChange: 'transform',
        WebkitTransform: 'translateZ(0)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        MozUserSelect: 'none',
        overscrollBehavior: 'contain',
        // Ensure it's on top and can receive events
        pointerEvents: 'auto',
        zIndex: 1
      }}
      tabIndex={0}
    >
      <div className="content-group original">
        {children}
      </div>
      <aside className="content-group duplicate" aria-hidden="true" data-duplicate="true" role="presentation">
        {children}
      </aside>
      <aside className="content-group duplicate" aria-hidden="true" data-duplicate="true" role="presentation">
        {children}
      </aside>
    </div>
  );
}

export default ReactSway;