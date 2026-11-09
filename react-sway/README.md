# react-sway

A React component for smooth, infinite, and interactive content scrolling on vertical, horizontal, or perspective depth axes, controllable via touch, mouse drag, wheel, keyboard, or edge hover. React 17, 18, and 19 are supported without runtime dependencies beyond React and React DOM.

## What is `react-sway`?

React Sway takes your list of items and makes them scroll endlessly. It's designed to be easy to use and performant, with auto-scrolling that pauses when users interact. Edge-hover layouts can also be configured to scroll only while the pointer hovers the active axis boundary: top/bottom for vertical loops or left/right for horizontal loops. Edge-hover speed ramps from idle to a bounded multiple of the configured speed as the pointer moves deeper into the boundary zone.

Vertical and horizontal modes duplicate content into inert `<aside>` elements with `aria-hidden="true"` and `role="presentation"`. Depth mode mounts each direct child once and recycles its 3D plane at zero opacity, keeping every plane behind the perspective camera.

### Core Features

*   **Smooth Infinite Scroll:** Content loops continuously on vertical, horizontal, or depth axes.
*   **Auto-Scroll:** Scrolls automatically, with configurable speed and direction.
*   **Edge Hover:** Use `edgeHoverScroll` to keep auto-scroll idle until the pointer enters the active axis boundary zone, with speed scaled smoothly by boundary depth and capped by `edgeHoverSpeedMultiplier`.
*   **User Friendly Interactions:**
    *   Click and drag to scroll.
    *   Swipe on touch devices.
    *   Mouse wheel support with axis-aware intent detection, delta-mode normalization, and velocity capping. Browser zoom gestures pass through.
    *   Nested buttons, links, and editable fields retain their native interactions.
    *   Keyboard controls: Spacebar to pause/resume, Arrow keys to scroll, Home/End to jump.
*   **External Input Bridge:** Use `ref` with `ReactSwayHandle` to route wheel and edge-hover intent from a parent drag/drop surface into Sway.
*   **Idle-Safe Listeners:** Global drag listeners are attached only during active drag or touch gestures and cleaned up on release, cancel, blur, and unmount.
*   **Responsive:** Adjusts to window resizing with debounced recalculation.
*   **Lazy Visibility Detection:** Add a `content-item` class to your child elements, and `react-sway` automatically uses an IntersectionObserver to add a `.visible` class when they enter the viewport. Useful for triggering CSS animations or deferred rendering. Configurable via `lazy`, `lazyRootMargin`, and `lazyThreshold` props.
*   **Reduced Motion Support:** Respects `prefers-reduced-motion: reduce` by lowering auto-scroll speed and disabling momentum effects.

## Installation

React Sway supports React and React DOM 17 or newer. Its published ESM and CommonJS artifacts use React's modern JSX runtime.

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
import './index.css';

function SwayUsageExample() {
  return (
    <section className="composer-grid" aria-label="Selected media order">
      <aside className="composer-cell composer-copy">
        <p>Selected order</p>
        <h2>Horizontal media rail</h2>
      </aside>

      <div className="composer-cell rail-cell">
        <ReactSway
          axis="horizontal"
          direction="left"
          edgeHoverScroll
          edgeHoverSize={72}
          keyboard={false}
          lazy={false}
          speed={0.8}
          wheelMode="capture"
        >
          <ol className="media-rail" aria-label="Selected post media order">
            {['Cover', 'Wide crop', 'Motion study', 'Detail frame', 'Archive still'].map((title, index) => (
              <li className="media-card" key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{title}</strong>
              </li>
            ))}
          </ol>
        </ReactSway>
      </div>
    </section>
  );
}

export default SwayUsageExample;
```

```css
.composer-grid {
  --line: rgb(255 255 255 / 0.12);

  background: var(--line);
  display: grid;
  gap: 1px;
  grid-template-columns: minmax(12rem, 0.7fr) minmax(0, 1.3fr);
  min-height: 18rem;
}

.composer-cell {
  background: #050505;
  color: white;
  min-width: 0;
  overflow: hidden;
  padding: 1rem;
  position: relative;
}

.composer-copy {
  align-content: end;
  display: grid;
  gap: 0.5rem;
}

.composer-copy p {
  color: rgb(255 255 255 / 0.58);
  font: 700 0.72rem/1 system-ui;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.composer-copy h2 {
  font: 400 clamp(1.6rem, 4vw, 3rem) / 0.95 Georgia, serif;
}

.rail-cell {
  min-height: 100%;
}

.rail-cell .react-sway-container {
  left: 0;
  top: 0;
}

.media-rail {
  display: flex;
  gap: 0.7rem;
  height: 100%;
  list-style: none;
  margin: 0;
  padding: 1rem;
}

.media-card {
  background: #0b0b0b;
  box-shadow: inset 0 0 0 1px var(--line);
  display: grid;
  flex: 0 0 clamp(9rem, 22vw, 12rem);
  grid-template-rows: auto 1fr;
  min-width: 0;
  padding: 0.75rem;
}

.media-card span {
  color: rgb(255 255 255 / 0.52);
  font: 700 0.68rem/1 system-ui;
}

.media-card strong {
  align-self: end;
  color: white;
  font: 400 1.35rem/0.98 Georgia, serif;
}
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

### Perspective depth scrolling

```tsx
import { ReactSway } from 'react-sway';

function DepthGallery({ active = true }: { active?: boolean }) {
  return (
    <div className="depth-viewport">
      <ReactSway active={active} ariaLabel="Photo gallery" axis="depth" direction="toward">
        <img alt="Mountain landscape" className="depth-image" src="/mountain.jpg" />
        <img alt="Modern architecture" className="depth-image depth-image-offset" src="/building.jpg" />
        <img alt="Coastal landscape" className="depth-image" src="/coast.jpg" />
      </ReactSway>
    </div>
  );
}
```

```css
.depth-viewport { height: 600px; overflow: hidden; position: relative; }
.depth-image { display: block; height: 200px; max-width: none; object-fit: cover; transform: translate(-50%, -50%); width: 160px; }
.depth-image-offset { margin-left: 50px; margin-top: -80px; width: 200px; }
```

Each **direct child** is one plane anchored at the viewport center. A fragment or a list wrapper is one plane; pass separate children for independent motion. Give children explicit sizes and use their CSS for composition, offsets, and tilt. The positioned parent supplies viewport dimensions and clipping. Keep `overflow: hidden` on that parent so the internal 3D scene retains depth.

`direction="toward"` approaches the camera; `"away"` recedes. Either direction infers `axis="depth"` when the axis is omitted. `depthPerspective` defaults to 800 CSS pixels and `depthSpacing` to 420; both must be finite and positive. Invalid values use their defaults, positive values below 1 are clamped to 1, and larger values are bounded by `Number.MAX_SAFE_INTEGER`. The exported `DEFAULT_DEPTH_PERSPECTIVE` and `DEFAULT_DEPTH_SPACING` constants share those defaults.

The loop period is the direct-child count times `depthSpacing`. Automatic movement and manual wheel/drag/keyboard input use the same periodic phase; vertical gestures and up/down arrows control depth. Set `autoScroll={false}` for manual exploration, or `active={false}` to suspend Sway's animation and input while preserving the current position. Empty depth scenes stay idle. Host applications can request reduced motion with `reducedMotion`; the system preference always takes precedence. Depth auto-scroll and momentum stop under reduced motion, while deliberate manual steps remain available. Existing planar loops retain their reduced speed behavior.

For decorative backgrounds, disable `keyboard`, `draggable`, and `wheelEnabled`, use empty image alt text, and put stationary application controls outside the Sway region. Automatic motion should have an accessible pause control. Inspect the [live depth example](https://lafittemehdy.github.io/sway/) for a responsive composition.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `active` | `boolean` | `true` | Suspend Sway animation and input when false, retaining content and position. Nested native controls remain usable. |
| `ariaLabel` | `string` | `'Scrollable content'` | Accessible name for the scrolling region. |
| `axis` | `'depth' \| 'horizontal' \| 'vertical'` | Inferred from `direction`, otherwise `'vertical'` | Scroll axis; depth assigns each direct child a 3D plane. |
| `autoScroll` | `boolean` | `true` | Enable/disable auto-scrolling. |
| `children` | `ReactNode` | - | Content elements to render in the scroll container. |
| `className` | `string` | - | Additional class name applied to the semantic scrolling region. |
| `depthPerspective` | `number` | `800` | Perspective camera distance in CSS pixels, depth mode only. |
| `depthSpacing` | `number` | `420` | Distance between consecutive depth planes in CSS pixels. |
| `direction` | `'away' \| 'down' \| 'left' \| 'right' \| 'toward' \| 'up'` | `'up'` | `left`/`right` infer horizontal; `toward`/`away` infer depth. Explicit `axis` takes precedence. |
| `draggable` | `boolean` | `true` | Enable mouse/touch drag interaction. |
| `edgeHoverInputMode` | `'external' \| 'hybrid'` | `'hybrid'` | Use intrinsic pointer sensing plus the imperative bridge, or external imperative ownership only for composed drag surfaces. |
| `edgeHoverScroll` | `boolean` | `false` | Only auto-scroll while hovering the active axis boundary: top/bottom for vertical, left/right for horizontal. A short ingress feather removes sensor chatter; velocity then accelerates through the physical edge and reaches its bounded cap one activation-zone width beyond it. |
| `edgeHoverSize` | `number` | `96` | Thickness in pixels of each edge-hover activation zone. |
| `edgeHoverSpeedMultiplier` | `number` | `6` | Maximum edge-hover velocity as a multiple of `speed`. The physical edge retains the established 3x response, then accelerates to the bounded `1`â€“`10` maximum beyond the viewport; set `1` for constant speed. |
| `friction` | `number` | `0.95` | Momentum decay coefficient (0-1, lower = more friction). |
| `keyboard` | `boolean` | `true` | Enable keyboard controls (Space, Arrow keys, Home/End). |
| `lazy` | `boolean` | `true` | Enable lazy visibility detection via IntersectionObserver. |
| `lazyRootMargin` | `string` | `'100px'` | IntersectionObserver `rootMargin` for lazy visibility detection. |
| `lazyThreshold` | `number` | `0.01` | IntersectionObserver `threshold`, normalized to the inclusive `0`â€“`1` interval. |
| `onPause` | `() => void` | - | Fired once when active autonomous scrolling transitions to interaction-paused. |
| `onResume` | `() => void` | - | Fired when interaction-paused autonomous scrolling resumes. |
| `onScroll` | `(position: number) => void` | - | Fired on every position change with the current scroll position. |
| `pauseOnInteraction` | `boolean` | `true` | Pause auto-scroll during user interaction. |
| `reducedMotion` | `boolean` | `false` | Request reduced motion in addition to the OS preference. Stops depth auto-scroll and momentum. |
| `resumeDelay` | `number` | `2000` | Milliseconds before auto-scroll resumes after interaction. |
| `speed` | `number` | `0.5` | Baseline auto-scroll speed in pixels per frame at 60fps. Edge-hover mode preserves this baseline inside the active zone and adds bounded depth acceleration. |
| `wheelEnabled` | `boolean` | `true` | Enable mouse wheel scrolling. |
| `wheelMode` | `'axis' \| 'capture'` | `'axis'` | Define whether wheel input only consumes gestures aligned with the Sway axis or captures every wheel event. |

## Imperative handle

`ReactSway` supports `ref` through `ReactSwayHandle`. This is intended for composed interactions where another component owns pointer capture, such as drag-and-drop reorder rails, but Sway should still receive wheel or edge-hover intent.

```tsx
import { useEffect, useRef } from 'react';
import {
  DEFAULT_EDGE_HOVER_SIZE,
  DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
  ReactSway,
  type ReactSwayHandle,
} from 'react-sway';

function ExternalDragBridge() {
  const swayRef = useRef<ReactSwayHandle | null>(null);
  const clearEdgeHover = () => swayRef.current?.clearEdgeHover();

  useEffect(() => clearEdgeHover, []);

  return (
    <div
      onPointerCancel={clearEdgeHover}
      onPointerMove={(event) => {
        swayRef.current?.handleEdgeHover({
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }}
      onPointerUp={clearEdgeHover}
      onWheel={(event) => {
        swayRef.current?.handleWheel(event.nativeEvent);
      }}
    >
      <ReactSway
        axis="horizontal"
        direction="left"
        draggable={false}
        edgeHoverInputMode="external"
        edgeHoverScroll
        edgeHoverSize={DEFAULT_EDGE_HOVER_SIZE}
        edgeHoverSpeedMultiplier={DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER}
        keyboard={false}
        ref={swayRef}
        wheelMode="capture"
      >
        <ol className="media-rail">
          <li>Cover</li>
          <li>Detail</li>
          <li>Motion</li>
        </ol>
      </ReactSway>
    </div>
  );
}
```

| Method | Description |
|--------|-------------|
| `handleEdgeHover(point)` | Acquires or updates external edge-hover ownership and applies depth-scaled speed. Returns `true` when an enabled, visible instance accepted the sample; the pointer may still be in the inactive center. External intent can drive motion when autonomous `autoScroll` is disabled. |
| `handleWheel(event)` | Routes an external wheel event through Sway's wheel normalization and ownership policy. Returns `true` when Sway consumed the event. |
| `clearEdgeHover()` | Releases external ownership, clears active edge-hover intensity, and lets the animation loop sleep when there is no momentum. |

External drag owners should retain pointer capture or route global pointer coordinates while held. Use `edgeHoverInputMode="external"` when the parent interaction is the sole input authority; this prevents intrinsic pointer sensing from competing with the drag owner. Always call `clearEdgeHover` on release, cancellation, lost ownership, and unmount.

`DEFAULT_EDGE_HOVER_SIZE` and `DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER` are public named constants. They let application-level interaction profiles inherit the package defaults without duplicating magic numbers. `edgeHoverSize` controls activation-zone geometry; `edgeHoverSpeedMultiplier` controls bounded peak velocity. The smooth acceleration curve remains package-owned so intrinsic and externally routed input share stable motion semantics.

## Runtime and accessibility contract

- Planar duplicate loop groups are inert, `aria-hidden`, presentation-only, non-interactive, and pointer-disabled. Depth children are never duplicated.
- Hidden pages pause animation and resume without consuming elapsed hidden time. Inactive instances also relinquish gesture ownership and discard momentum.
- Mouse and touch global listeners are installed only during active drag gestures and are removed on release, cancel, blur, unmount, or prop changes.
- Edge-hover mode does not continuously request animation frames while idle; it wakes when the pointer enters an edge, wheel input arrives, momentum exists, or auto-scroll resumes.
- `wheelMode="axis"` lets cross-axis page scroll pass through. `wheelMode="capture"` intentionally lets Sway own every wheel event it receives.

## License

This package is licensed under the [MIT License](https://github.com/lafittemehdy/sway/blob/main/LICENSE).
