# react-sway

A React component for smooth, infinite, and interactive content scrolling. It duplicates content to create a seamless looping effect, controllable via touch, mouse drag, wheel, and keyboard.

## What is `react-sway`?

React Sway takes your list of items and makes them scroll endlessly. It's designed to be easy to use and performant, with auto-scrolling that pauses when users interact.

It works by duplicating your content to create a seamless loop and uses CSS transforms for smooth animation. The duplicated content is wrapped in `<aside>` elements with `aria-hidden="true"` and `role="presentation"` to ensure good accessibility and helps search engines understand the content structure.

### Core Features

*   **Smooth Infinite Scroll:** Content loops continuously.
*   **Auto-Scroll:** Scrolls automatically, with configurable speed and direction.
*   **User Friendly Interactions:**
    *   Click and drag to scroll.
    *   Swipe on touch devices.
    *   Mouse wheel support with velocity capping.
    *   Keyboard controls: Spacebar to pause/resume, ArrowUp/ArrowDown to scroll, Home/End to jump.
*   **Responsive:** Adjusts to window resizing with debounced recalculation.
*   **Lazy Visibility Detection:** Add a `content-item` class to your child elements, and `react-sway` automatically uses an IntersectionObserver to add a `.visible` class when they enter the viewport. Useful for triggering CSS animations or deferred rendering. Configurable via `lazy`, `lazyRootMargin`, and `lazyThreshold` props.
*   **Reduced Motion Support:** Respects `prefers-reduced-motion: reduce` by lowering auto-scroll speed and disabling momentum effects.

## Installation

```bash
npm install react-sway
# or
yarn add react-sway
# or
pnpm add react-sway
```

## Usage

```tsx
import { ReactSway } from 'react-sway';
import './index.css'; // Your global styles

function SwayUsageExample() {
  return (
    <div className="scroller-container"> {/* Style this container to define ReactSway's area (e.g., full-page, or a specific height) */}
      <ReactSway>
        <div className="content-item" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>Seamless Scrolling</h2>
          <p>Experience buttery smooth infinite scrolling with no stutters or pauses.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h2>Touch & Mouse Support</h2>
          <p>Interact naturally with touch gestures, mouse wheel, or click-and-drag.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <h2>Momentum Scrolling</h2>
          <p>Flick to scroll with realistic physics-based momentum and friction.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <h2>Performance Optimized</h2>
          <p>Using requestAnimationFrame for 60+ FPS scrolling on all devices.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h2>Responsive Design</h2>
          <p>Adapts perfectly to any screen size and device orientation.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <h2>No Native Scroll</h2>
          <p>Custom implementation avoids native scroll jank and inconsistencies.</p>
        </div>

        <div className="content-item" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <h2>Continuous Loop</h2>
          <p>Content loops seamlessly without any visible seams or jumps.</p>
        </div>
      </ReactSway>
    </div>
  );
}

export default SwayUsageExample;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoScroll` | `boolean` | `true` | Enable/disable auto-scrolling. |
| `children` | `ReactNode` | — | Content elements to render in the scroll container. |
| `direction` | `'down' \| 'up'` | `'up'` | Auto-scroll direction. |
| `draggable` | `boolean` | `true` | Enable mouse/touch drag interaction. |
| `friction` | `number` | `0.95` | Momentum decay coefficient (0–1, lower = more friction). |
| `keyboard` | `boolean` | `true` | Enable keyboard controls (Space, ArrowUp/Down, Home/End). |
| `lazy` | `boolean` | `true` | Enable lazy visibility detection via IntersectionObserver. |
| `lazyRootMargin` | `string` | `'100px'` | IntersectionObserver `rootMargin` for lazy visibility detection. |
| `lazyThreshold` | `number` | `0.01` | IntersectionObserver `threshold` for lazy visibility detection. |
| `onPause` | `() => void` | — | Fired when scrolling pauses. |
| `onResume` | `() => void` | — | Fired when scrolling resumes after pause. |
| `onScroll` | `(position: number) => void` | — | Fired on every position change with the current scroll position. |
| `pauseOnInteraction` | `boolean` | `true` | Pause auto-scroll during user interaction. |
| `resumeDelay` | `number` | `2000` | Milliseconds before auto-scroll resumes after interaction. |
| `speed` | `number` | `0.5` | Auto-scroll speed in pixels per frame at 60fps. |
| `wheelEnabled` | `boolean` | `true` | Enable mouse wheel scrolling. |

## License

This package is licensed under the [MIT License](../../LICENSE).
