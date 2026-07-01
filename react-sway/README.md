# react-sway

A React component for smooth, infinite, and interactive content scrolling on the vertical or horizontal axis. It duplicates content to create a seamless looping effect, controllable via touch, mouse drag, wheel, keyboard, or edge hover.

## What is `react-sway`?

React Sway takes your list of items and makes them scroll endlessly. It's designed to be easy to use and performant, with auto-scrolling that pauses when users interact. Edge-hover layouts can also be configured to scroll only while the pointer hovers the active axis boundary: top/bottom for vertical loops or left/right for horizontal loops.

It works by duplicating your content to create a seamless loop and uses CSS transforms for smooth animation. The duplicated content is wrapped in `<aside>` elements with `aria-hidden="true"` and `role="presentation"` to ensure good accessibility and helps search engines understand the content structure.

### Core Features

*   **Smooth Infinite Scroll:** Content loops continuously on the vertical or horizontal axis.
*   **Auto-Scroll:** Scrolls automatically, with configurable speed and direction.
*   **Edge Hover:** Use `edgeHoverScroll` to keep auto-scroll idle until the pointer enters the active axis boundary zone.
*   **User Friendly Interactions:**
    *   Click and drag to scroll.
    *   Swipe on touch devices.
    *   Mouse wheel support with axis-aware intent detection, delta-mode normalization, and velocity capping.
    *   Keyboard controls: Spacebar to pause/resume, Arrow keys to scroll, Home/End to jump.
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

### Auto-scroll and edge-hover examples

React Sway can either move automatically or stay idle until the pointer reaches an axis boundary. The resulting examples are the product of two axes and two trigger modes.

```tsx
import { ReactSway } from 'react-sway';

function TriggerModeExamples() {
  const edgeOnlyProps = {
    draggable: false,
    keyboard: false,
    wheelEnabled: false,
  };

  return (
    <div className="trigger-mode-grid">
      <div className="trigger-mode-case">
        <ReactSway>
          <article className="content-item">Vertical auto</article>
          <article className="content-item">Automatic trigger</article>
          <article className="content-item">Continuous loop</article>
        </ReactSway>
      </div>

      <div className="trigger-mode-case">
        <ReactSway {...edgeOnlyProps} edgeHoverScroll edgeHoverSize={96}>
          <article className="content-item">Vertical edge</article>
          <article className="content-item">Top boundary</article>
          <article className="content-item">Bottom boundary</article>
        </ReactSway>
      </div>

      <div className="trigger-mode-case trigger-mode-case-horizontal">
        <ReactSway axis="horizontal">
          <article className="content-item">Horizontal auto</article>
          <article className="content-item">Automatic trigger</article>
          <article className="content-item">Continuous loop</article>
        </ReactSway>
      </div>

      <div className="trigger-mode-case trigger-mode-case-horizontal">
        <ReactSway {...edgeOnlyProps} axis="horizontal" edgeHoverScroll edgeHoverSize={96}>
          <article className="content-item">Horizontal edge</article>
          <article className="content-item">Left boundary</article>
          <article className="content-item">Right boundary</article>
        </ReactSway>
      </div>
    </div>
  );
}
```

```css
.trigger-mode-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.trigger-mode-case {
  height: 320px;
  overflow: hidden;
  position: relative;
}

.trigger-mode-case-horizontal {
  align-items: center;
  display: flex;
}

.trigger-mode-case-horizontal .content-item {
  flex: 0 0 260px;
}
```

Automatic cases start moving immediately and keep the default drag, touch, wheel, and keyboard interactions enabled. Edge-hover cases stay idle until the pointer enters top/bottom for vertical instances or left/right for horizontal instances.

### Wheel intent modes

By default, React Sway treats wheel gestures as axis-aware input. A horizontal instance consumes horizontal trackpad movement and Shift+wheel, while ordinary vertical wheel movement is left to the page. This prevents horizontal showcases from trapping page scroll when the pointer is above them.

Use `wheelMode="capture"` when the Sway should intentionally own every wheel event that reaches it.

```tsx
function WheelModeExamples() {
  return (
    <>
      <ReactSway axis="horizontal" wheelMode="axis">
        <article className="content-item">Horizontal intent only</article>
        <article className="content-item">Vertical wheel still scrolls the page</article>
      </ReactSway>

      <ReactSway axis="horizontal" wheelMode="capture">
        <article className="content-item">Full wheel capture</article>
        <article className="content-item">Vertical wheel drives the Sway</article>
      </ReactSway>
    </>
  );
}
```

```tsx
function MinimalEdgeHoverExamples() {
  return (
    <>
      <ReactSway draggable={false} edgeHoverScroll keyboard={false} wheelEnabled={false}>
        <article className="content-item">Project Alpha</article>
        <article className="content-item">Project Beta</article>
        <article className="content-item">Project Gamma</article>
      </ReactSway>

      <ReactSway axis="horizontal" draggable={false} edgeHoverScroll keyboard={false} wheelEnabled={false}>
        <article className="content-item">Project Alpha</article>
        <article className="content-item">Project Beta</article>
        <article className="content-item">Project Gamma</article>
      </ReactSway>
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `axis` | `'vertical' \| 'horizontal'` | Inferred from `direction`, otherwise `'vertical'` | Scroll axis. Use `'horizontal'` for left/right loops. |
| `autoScroll` | `boolean` | `true` | Enable/disable auto-scrolling. |
| `children` | `ReactNode` | - | Content elements to render in the scroll container. |
| `direction` | `'down' \| 'left' \| 'right' \| 'up'` | `'up'` | Auto-scroll direction. `left` and `right` imply horizontal scrolling when `axis` is omitted. |
| `draggable` | `boolean` | `true` | Enable mouse/touch drag interaction. |
| `edgeHoverScroll` | `boolean` | `false` | Only auto-scroll while hovering the active axis boundary: top/bottom for vertical, left/right for horizontal. |
| `edgeHoverSize` | `number` | `96` | Thickness in pixels of each edge-hover activation zone. |
| `friction` | `number` | `0.95` | Momentum decay coefficient (0-1, lower = more friction). |
| `keyboard` | `boolean` | `true` | Enable keyboard controls (Space, Arrow keys, Home/End). |
| `lazy` | `boolean` | `true` | Enable lazy visibility detection via IntersectionObserver. |
| `lazyRootMargin` | `string` | `'100px'` | IntersectionObserver `rootMargin` for lazy visibility detection. |
| `lazyThreshold` | `number` | `0.01` | IntersectionObserver `threshold` for lazy visibility detection. |
| `onPause` | `() => void` | - | Fired when scrolling pauses. |
| `onResume` | `() => void` | - | Fired when scrolling resumes after pause. |
| `onScroll` | `(position: number) => void` | - | Fired on every position change with the current scroll position. |
| `pauseOnInteraction` | `boolean` | `true` | Pause auto-scroll during user interaction. |
| `resumeDelay` | `number` | `2000` | Milliseconds before auto-scroll resumes after interaction. |
| `speed` | `number` | `0.5` | Auto-scroll speed in pixels per frame at 60fps. |
| `wheelEnabled` | `boolean` | `true` | Enable mouse wheel scrolling. |
| `wheelMode` | `'axis' \| 'capture'` | `'axis'` | Define whether wheel input only consumes gestures aligned with the Sway axis or captures every wheel event. |

## License

This package is licensed under the [MIT License](../../LICENSE).
