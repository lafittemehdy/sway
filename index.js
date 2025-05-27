class SmoothInfiniteScroller {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scrollSpeed = 0.5; // pixels per frame at 60fps
        this.position = 0;
        this.velocity = 0;
        this.isDragging = false;
        this.lastTouchY = 0;
        this.lastMouseY = 0;
        this.autoScrollEnabled = true;
        this.inactivityTimer = null;
        this.inactivityDelay = 2000;
        this.friction = 0.95;
        this.lastFrameTime = 0;
        this.contentHeight = 0;
        this.containerHeight = window.innerHeight;
        this.isPaused = false;
        this.observer = null;

        this.init();
    }

    init() {
        this.duplicateContent();
        this.setupIntersectionObserver();
        this.bindEvents();
        this.startAnimation();
    }

    setupIntersectionObserver() {
        // Setup lazy loading for content items
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.01
        });

        // Observe all content items
        const items = this.container.querySelectorAll('.content-item');
        items.forEach(item => this.observer.observe(item));
    }

    duplicateContent() {
        const originalContent = this.container.innerHTML;

        // Create wrapper for original content
        const originalWrapper = document.createElement('div');
        originalWrapper.className = 'content-group original';
        originalWrapper.innerHTML = originalContent;

        // Create duplicates wrapped in aside elements
        const aside1 = document.createElement('aside');
        aside1.className = 'content-group duplicate';
        aside1.setAttribute('aria-hidden', 'true');
        aside1.setAttribute('data-duplicate', 'true');
        aside1.setAttribute('role', 'presentation');
        aside1.innerHTML = originalContent;

        const aside2 = document.createElement('aside');
        aside2.className = 'content-group duplicate';
        aside2.setAttribute('aria-hidden', 'true');
        aside2.setAttribute('data-duplicate', 'true');
        aside2.setAttribute('role', 'presentation');
        aside2.innerHTML = originalContent;

        // Clear and append all groups
        this.container.innerHTML = '';
        this.container.appendChild(originalWrapper);
        this.container.appendChild(aside1);
        this.container.appendChild(aside2);

        // Calculate content height after duplication
        this.contentHeight = this.container.scrollHeight;
        this.loopPoint = this.contentHeight / 3;
    }

    bindEvents() {
        // Mouse events
        this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Touch events (passive for better performance)
        this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });

        // Wheel event (non-passive as we need preventDefault)
        this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        // Keyboard navigation
        document.addEventListener('keydown', this.onKeyDown.bind(this));

        // Resize event
        window.addEventListener('resize', this.onResize.bind(this));
    }

    onKeyDown(e) {
        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.velocity += 15;
                this.pauseAutoScroll();
                this.scheduleAutoScrollResume();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.velocity -= 15;
                this.pauseAutoScroll();
                this.scheduleAutoScrollResume();
                break;
            case 'Home':
                e.preventDefault();
                this.position = 0;
                this.velocity = 0;
                this.pauseAutoScroll();
                this.scheduleAutoScrollResume();
                break;
            case 'End':
                e.preventDefault();
                this.position = -this.loopPoint;
                this.velocity = 0;
                this.pauseAutoScroll();
                this.scheduleAutoScrollResume();
                break;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.pauseAutoScroll();
        } else {
            this.autoScrollEnabled = true;
        }
    }

    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseY = e.clientY;
        this.velocity = 0;
        this.pauseAutoScroll();
        this.container.style.cursor = 'grabbing';
        e.preventDefault();
    }

    onMouseMove(e) {
        if (!this.isDragging) return;

        const deltaY = e.clientY - this.lastMouseY;
        this.position += deltaY;
        this.velocity = deltaY;
        this.lastMouseY = e.clientY;
        e.preventDefault();
    }

    onMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.cursor = 'grab';
        this.scheduleAutoScrollResume();
        e.preventDefault();
    }

    onTouchStart(e) {
        this.isDragging = true;
        this.lastTouchY = e.touches[0].clientY;
        this.velocity = 0;
        this.pauseAutoScroll();
        e.preventDefault();
    }

    onTouchMove(e) {
        if (!this.isDragging) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - this.lastTouchY;
        this.position += deltaY;
        this.velocity = deltaY;
        this.lastTouchY = touch.clientY;
        e.preventDefault();
    }

    onTouchEnd(e) {
        this.isDragging = false;
        this.scheduleAutoScrollResume();
        e.preventDefault();
    }

    onWheel(e) {
        e.preventDefault();
        this.velocity -= e.deltaY * 0.3;
        this.pauseAutoScroll();
        this.scheduleAutoScrollResume();
    }

    onResize() {
        this.containerHeight = window.innerHeight;
    }

    pauseAutoScroll() {
        this.autoScrollEnabled = false;
        clearTimeout(this.inactivityTimer);
    }

    scheduleAutoScrollResume() {
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.autoScrollEnabled = true;
        }, this.inactivityDelay);
    }

    animate(currentTime) {
        const deltaTime = this.lastFrameTime ? (currentTime - this.lastFrameTime) / 16.667 : 1;
        this.lastFrameTime = currentTime;

        // Auto-scroll when enabled and not paused
        if (this.autoScrollEnabled && !this.isDragging && !this.isPaused) {
            this.position -= this.scrollSpeed * deltaTime;
        }

        // Apply velocity with friction
        if (Math.abs(this.velocity) > 0.1) {
            this.position += this.velocity * deltaTime;
            this.velocity *= this.friction;
        } else {
            this.velocity = 0;
        }

        // Keep position within bounds to prevent overflow
        while (this.position > 0) {
            this.position -= this.loopPoint;
        }
        while (this.position < -this.loopPoint * 2) {
            this.position += this.loopPoint;
        }

        // Calculate visual position using modulo for seamless wrapping
        let visualPosition = this.position % this.loopPoint;
        if (visualPosition > 0) visualPosition -= this.loopPoint;

        // Apply transform
        this.container.style.transform = `translate3d(0, ${visualPosition}px, 0)`;

        // Continue animation
        requestAnimationFrame(this.animate.bind(this));
    }

    startAnimation() {
        this.container.style.cursor = 'grab';
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Initialize the scroller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SmoothInfiniteScroller('scrollerContent');
});