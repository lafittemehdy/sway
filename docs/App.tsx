/**
 * Demo page for the ReactSway feature matrix in the documentation app.
 */
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { ReactSway, type SwayDirection, type SwayWheelMode } from 'react-sway';
import { ArchClip, RoundedLeftClip, RoundedRectangleClip } from 'react-veil';

import 'react-veil/style.css';
import './index.css';

type EdgeName = 'bottom' | 'left' | 'right' | 'top';
type ShowcaseAxis = 'horizontal' | 'vertical';
type VeilShape = 'arch' | 'rounded-left' | 'rounded-rectangle';
type DemoWheelMode = SwayWheelMode | 'off';

interface AxisPanelState {
  direction: SwayDirection;
  dragEnabled: boolean;
  edgeHoverEnabled: boolean;
  edgeHoverSize: number;
  keyboardEnabled: boolean;
  running: boolean;
  speedFactor: 1 | 2;
  wheelMode: DemoWheelMode;
}

interface ControlOption {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}

interface DemoPost {
  body: string;
  image: string;
  mediaCardRatio: number;
  meta: string;
  title: string;
  veilShape: VeilShape;
}

interface ShowcaseCase {
  axis: ShowcaseAxis;
  baseSpeed: number;
  defaultDirection: SwayDirection;
  edges: EdgeName[];
  label: string;
}

const EDGE_DEFAULT_SIZE = 92;
const EDGE_WIDE_SIZE = 148;

const IMAGE_SOURCES = [
  new URL('./assets/01.jpg', import.meta.url).href,
  new URL('./assets/02.jpg', import.meta.url).href,
  new URL('./assets/03.jpg', import.meta.url).href,
  new URL('./assets/04.jpg', import.meta.url).href,
  new URL('./assets/05.jpg', import.meta.url).href,
  new URL('./assets/06.jpg', import.meta.url).href,
  new URL('./assets/07.jpg', import.meta.url).href,
];

// Twelve slots give a deterministic shuffle with equal cardinality for every Veil shape.
const VEIL_SHAPE_SEQUENCE: VeilShape[] = [
  'arch',
  'rounded-left',
  'rounded-rectangle',
  'rounded-left',
  'arch',
  'rounded-rectangle',
  'arch',
  'rounded-rectangle',
  'rounded-left',
  'arch',
  'rounded-left',
  'rounded-rectangle',
];

function getVeilShape(index: number): VeilShape {
  return VEIL_SHAPE_SEQUENCE[index % VEIL_SHAPE_SEQUENCE.length];
}

const POSTS: DemoPost[] = [
  {
    body:
      'Before the screen, the page had the dignity of a frontier. It could be weighed in the hand, counted, folded, exhausted. Then came the luminous surface, and with it a quieter empire: the document ceased to be a sheet and became a country through which the eye descended, obedient and restless, as if memory itself had been given corridors without doors.',
    image: IMAGE_SOURCES[0],
    mediaCardRatio: 2.2,
    meta: '01 / 07',
    title: 'The page gives way',
    veilShape: getVeilShape(0),
  },
  {
    body:
      'The scrollbar first appeared with the modesty of a servant and the authority of a magistrate. Thin, pale, almost apologetic, it stood beside the window and revealed a shocking truth: what the user saw was only a portion of the world, and below that visible chamber another province waited in silence, already written, already demanding to be reached.',
    image: IMAGE_SOURCES[1],
    mediaCardRatio: 1.86,
    meta: '02 / 07',
    title: 'The narrow witness',
    veilShape: getVeilShape(1),
  },
  {
    body:
      'When the mouse wheel entered daily life, no trumpet announced it. A finger merely bent, and the page obeyed. Yet in that small motion there was a change of civilization, for the reader no longer turned from one bounded surface to another; he slipped through a vertical season of facts, errands, messages, promises, and weariness.',
    image: IMAGE_SOURCES[2],
    mediaCardRatio: 2.08,
    meta: '03 / 07',
    title: "The wheel's descent",
    veilShape: getVeilShape(2),
  },
  {
    body:
      'The hand, once trained by paper to lift and separate, learned a new humility before glass. It dragged, tapped, hesitated, returned. Beneath this choreography lay a moral ambiguity: the interface gave man more freedom than the page, and at the same time taught him to accept an obedience more continuous, more intimate, more difficult to refuse.',
    image: IMAGE_SOURCES[3],
    mediaCardRatio: 2.5,
    meta: '04 / 07',
    title: 'The obedient hand',
    veilShape: getVeilShape(3),
  },
  {
    body:
      'The early graphical window was less a machine than a room lit at night. Inside it, lists opened, letters waited, ledgers extended beyond the lower edge, and the cursor hovered like a nervous visitor. To scroll was to admit that the visible world was provisional, that truth might be hiding a few inches beneath the eye.',
    image: IMAGE_SOURCES[4],
    mediaCardRatio: 1.74,
    meta: '05 / 07',
    title: 'Rooms of light',
    veilShape: getVeilShape(4),
  },
  {
    body:
      'Later, the feed arrived and abolished the old consolation of an ending. It offered news, faces, grief, amusement, commerce, confession, and spectacle in one descending procession. The user believed he was choosing, but the stream had already chosen the form of his attention: forward, downward, onward, without ceremony.',
    image: IMAGE_SOURCES[5],
    mediaCardRatio: 2.33,
    meta: '06 / 07',
    title: 'The endless procession',
    veilShape: getVeilShape(5),
  },
  {
    body:
      'There was grandeur in this fatigue. The glowing monitor did not merely display information; it asked the mind to inhabit motion as a habit, to accept knowledge as a passage rather than a possession. At the edge of the viewport, where content disappeared, modern man discovered both his impatience and his longing for completion.',
    image: IMAGE_SOURCES[6],
    mediaCardRatio: 1.98,
    meta: '07 / 07',
    title: 'Fatigue and light',
    veilShape: getVeilShape(6),
  },
];

const VERTICAL_TEXT_CYCLE_COUNT = 12;

const TEXT_POSTS: DemoPost[] = Array.from({ length: VERTICAL_TEXT_CYCLE_COUNT }, (_, cycleIndex) =>
  POSTS.map((post, postIndex) => {
    const sequenceNumber = cycleIndex * POSTS.length + postIndex + 1;

    return {
      ...post,
      body: `${post.body} Each return of the passage renews the same historical bargain: the machine offers continuity, and the reader, half sovereign and half captive, follows the movement until the boundary between seeking and surrender becomes almost impossible to name.`,
      meta: `${String(sequenceNumber).padStart(2, '0')} / ${POSTS.length * VERTICAL_TEXT_CYCLE_COUNT}`,
      veilShape: getVeilShape(sequenceNumber - 1),
    };
  }),
).flat();

const SHOWCASE: Record<'horizontal' | 'vertical', ShowcaseCase> = {
  horizontal: {
    axis: 'horizontal',
    baseSpeed: 0.96,
    defaultDirection: 'left',
    edges: ['left', 'right'],
    label: 'horizontal',
  },
  vertical: {
    axis: 'vertical',
    baseSpeed: 0.68,
    defaultDirection: 'up',
    edges: ['top', 'bottom'],
    label: 'vertical',
  },
};

/**
 * Renders one semantic cluster of controls for a single Sway instance.
 */
function ControlCluster({ ariaLabel, controls, label }: { ariaLabel: string; controls: ControlOption[]; label: string }) {
  const disabled = controls.every((control) => control.disabled);

  return (
    <div className="control-cluster" data-disabled={disabled} role="group" aria-label={ariaLabel}>
      <span className="control-cluster-label" aria-hidden="true">
        {label}
      </span>
      <div className="control-buttons">
        {controls.map((control) => (
          <button
            aria-pressed={control.active}
            disabled={control.disabled}
            key={control.label}
            onClick={control.onClick}
            type="button"
          >
            {control.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one axis-specific control surface inside a dedicated mosaic square.
 */
function AxisToolbar({ children, title, titleId }: { children: ReactNode; title: string; titleId: string }) {
  return (
    <section className="axis-toolbar" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <div className="toolbar-control-row">{children}</div>
    </section>
  );
}

/**
 * Renders the shared editorial copy attached to every showcase item.
 */
function PostCopy({ post }: { post: DemoPost }) {
  return (
    <div className="post-copy">
      <h3>{post.title}</h3>
      <p>{post.body}</p>
    </div>
  );
}

/**
 * Renders one of the three Veil clip shapes while preserving a shared media contract.
 */
function VeilClip({ children, shape }: { children: ReactNode; shape: VeilShape }) {
  if (shape === 'arch') {
    return <ArchClip className="post-image-veil">{children}</ArchClip>;
  }

  if (shape === 'rounded-left') {
    return <RoundedLeftClip className="post-image-veil">{children}</RoundedLeftClip>;
  }

  return <RoundedRectangleClip className="post-image-veil">{children}</RoundedRectangleClip>;
}

/**
 * Renders a clipped image frame used by both Sway axes.
 */
function PostImageFrame({ post }: { post: DemoPost }) {
  return (
    <figure className="post-image-frame">
      <span className="post-image-index">{post.meta}</span>
      <VeilClip shape={post.veilShape}>
        <img alt="" aria-hidden="true" className="post-image" draggable="false" src={post.image} />
      </VeilClip>
    </figure>
  );
}

/**
 * Renders an image-and-text tile used by horizontal Sway tracks.
 */
function MediaTile({ post }: { post: DemoPost }) {
  return (
    <article
      className="content-item media-tile"
      style={{ '--media-card-ratio': String(post.mediaCardRatio) } as CSSProperties}
    >
      <PostImageFrame post={post} />
      <PostCopy post={post} />
    </article>
  );
}

/**
 * Renders an image-and-text item used by vertical Sway tracks.
 */
function TextPost({ post }: { post: DemoPost }) {
  return (
    <article className="content-item text-post">
      <PostImageFrame post={post} />
      <PostCopy post={post} />
    </article>
  );
}

/**
 * Renders a configured ReactSway surface with optional edge trigger markers.
 */
function SwayTrack({
  autoScroll = true,
  children,
  direction,
  draggable,
  edgeHoverEnabled = false,
  edgeHoverSize = EDGE_DEFAULT_SIZE,
  keyboard,
  showcaseCase,
  speed,
  wheelEnabled,
  wheelMode,
}: {
  autoScroll?: boolean;
  children: ReactNode;
  direction?: SwayDirection;
  draggable?: boolean;
  edgeHoverEnabled?: boolean;
  edgeHoverSize?: number;
  keyboard?: boolean;
  showcaseCase: ShowcaseCase;
  speed?: number;
  wheelEnabled?: boolean;
  wheelMode?: SwayWheelMode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!edgeHoverEnabled || showcaseCase.axis !== 'vertical') return;

    let animationFrameId: number | null = null;

    const updateVisibleEdgeFrame = () => {
      animationFrameId = null;

      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const visibleStart = Math.max(rect.top, 0);
      const visibleEnd = Math.min(rect.bottom, window.innerHeight);
      const visibleSize = Math.max(0, visibleEnd - visibleStart);
      const effectiveEdgeSize = Math.min(edgeHoverSize, visibleSize / 2);

      stage.style.setProperty('--visible-edge-size', `${effectiveEdgeSize}px`);
      stage.style.setProperty('--visible-edge-start', `${Math.max(0, visibleStart - rect.top)}px`);
      stage.style.setProperty('--visible-edge-end', `${Math.max(0, visibleEnd - rect.top)}px`);
    };

    const scheduleVisibleEdgeFrameUpdate = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(updateVisibleEdgeFrame);
    };

    scheduleVisibleEdgeFrameUpdate();
    window.addEventListener('resize', scheduleVisibleEdgeFrameUpdate);
    window.addEventListener('scroll', scheduleVisibleEdgeFrameUpdate, { passive: true });

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', scheduleVisibleEdgeFrameUpdate);
      window.removeEventListener('scroll', scheduleVisibleEdgeFrameUpdate);
    };
  }, [edgeHoverEnabled, edgeHoverSize, showcaseCase.axis]);

  return (
    <div
      className={`sway-stage ${showcaseCase.axis}-stage`}
      data-sway-mode={edgeHoverEnabled ? 'edge' : 'auto'}
      ref={stageRef}
      style={{ '--edge-size': `${edgeHoverSize}px` } as CSSProperties}
    >
      {edgeHoverEnabled && showcaseCase.edges.map((edge) => (
        <div
          className={`edge-indicator edge-indicator-${edge} ${
            showcaseCase.axis === 'vertical' ? 'edge-indicator-viewport' : ''
          }`}
          key={`${edge}-${edgeHoverSize}`}
          aria-hidden="true"
        />
      ))}
      <ReactSway
        autoScroll={autoScroll}
        axis={showcaseCase.axis}
        direction={direction ?? showcaseCase.defaultDirection}
        draggable={draggable}
        edgeHoverScroll={edgeHoverEnabled}
        edgeHoverSize={edgeHoverSize}
        keyboard={keyboard}
        resumeDelay={650}
        speed={speed ?? showcaseCase.baseSpeed}
        wheelEnabled={wheelEnabled}
        wheelMode={wheelMode}
      >
        {children}
      </ReactSway>
    </div>
  );
}

/**
 * Renders the docs app used to inspect every public ReactSway interaction mode.
 */
function App() {
  const [horizontal, setHorizontal] = useState<AxisPanelState>({
    direction: 'left',
    dragEnabled: true,
    edgeHoverEnabled: false,
    edgeHoverSize: EDGE_DEFAULT_SIZE,
    keyboardEnabled: true,
    running: true,
    speedFactor: 1,
    wheelMode: 'axis',
  });
  const [vertical, setVertical] = useState<AxisPanelState>({
    direction: 'up',
    dragEnabled: true,
    edgeHoverEnabled: false,
    edgeHoverSize: EDGE_DEFAULT_SIZE,
    keyboardEnabled: true,
    running: true,
    speedFactor: 1,
    wheelMode: 'axis',
  });

  const horizontalSpeed = SHOWCASE.horizontal.baseSpeed * horizontal.speedFactor;
  const horizontalStyle = { '--edge-size': `${horizontal.edgeHoverSize}px` } as CSSProperties;
  const horizontalEdgeActive = horizontal.running && horizontal.edgeHoverEnabled;
  const horizontalWheelEnabled = horizontal.wheelMode !== 'off' && !horizontalEdgeActive;
  const horizontalWheelMode = horizontal.wheelMode === 'capture' ? 'capture' : 'axis';
  const verticalSpeed = SHOWCASE.vertical.baseSpeed * vertical.speedFactor;
  const verticalStyle = { '--edge-size': `${vertical.edgeHoverSize}px` } as CSSProperties;
  const verticalEdgeActive = vertical.running && vertical.edgeHoverEnabled;
  const verticalWheelEnabled = vertical.wheelMode !== 'off' && !verticalEdgeActive;
  const verticalWheelMode = vertical.wheelMode === 'capture' ? 'capture' : 'axis';
  const horizontalDirectionControls: ControlOption[] = [
    {
      active: horizontal.direction === 'left',
      label: 'left',
      onClick: () => setHorizontal((state) => ({ ...state, direction: 'left' })),
    },
    {
      active: horizontal.direction === 'right',
      label: 'right',
      onClick: () => setHorizontal((state) => ({ ...state, direction: 'right' })),
    },
  ];
  const horizontalEdgeSizeControls: ControlOption[] = [
    {
      active: horizontalEdgeActive && horizontal.edgeHoverSize === EDGE_DEFAULT_SIZE,
      disabled: !horizontalEdgeActive,
      label: '92px',
      onClick: () => setHorizontal((state) => ({ ...state, edgeHoverSize: EDGE_DEFAULT_SIZE })),
    },
    {
      active: horizontalEdgeActive && horizontal.edgeHoverSize === EDGE_WIDE_SIZE,
      disabled: !horizontalEdgeActive,
      label: '148px',
      onClick: () => setHorizontal((state) => ({ ...state, edgeHoverSize: EDGE_WIDE_SIZE })),
    },
  ];
  const horizontalInputControls: ControlOption[] = [
    {
      active: horizontal.dragEnabled,
      label: 'drag',
      onClick: () => setHorizontal((state) => ({ ...state, dragEnabled: !state.dragEnabled })),
    },
    {
      active: horizontal.keyboardEnabled,
      label: 'keys',
      onClick: () => setHorizontal((state) => ({ ...state, keyboardEnabled: !state.keyboardEnabled })),
    },
  ];
  const horizontalWheelControls: ControlOption[] = [
    {
      active: horizontalWheelEnabled && horizontal.wheelMode === 'axis',
      disabled: horizontalEdgeActive,
      label: 'axis',
      onClick: () => setHorizontal((state) => ({ ...state, wheelMode: 'axis' })),
    },
    {
      active: horizontalWheelEnabled && horizontal.wheelMode === 'capture',
      disabled: horizontalEdgeActive,
      label: 'capture',
      onClick: () => setHorizontal((state) => ({ ...state, wheelMode: 'capture' })),
    },
    {
      active: horizontal.wheelMode === 'off' || horizontalEdgeActive,
      disabled: horizontalEdgeActive,
      label: 'off',
      onClick: () => setHorizontal((state) => ({ ...state, wheelMode: 'off' })),
    },
  ];
  const horizontalModeControls: ControlOption[] = [
    {
      active: horizontal.running && !horizontal.edgeHoverEnabled,
      label: 'auto',
      onClick: () => setHorizontal((state) => ({ ...state, edgeHoverEnabled: false, running: true })),
    },
    {
      active: horizontalEdgeActive,
      label: 'edge',
      onClick: () => setHorizontal((state) => ({ ...state, edgeHoverEnabled: true, running: true })),
    },
    {
      active: !horizontal.running,
      label: 'pause',
      onClick: () => setHorizontal((state) => ({ ...state, running: false })),
    },
  ];
  const horizontalSpeedControls: ControlOption[] = [
    {
      active: horizontal.speedFactor === 1,
      label: '1x',
      onClick: () => setHorizontal((state) => ({ ...state, speedFactor: 1 })),
    },
    {
      active: horizontal.speedFactor === 2,
      label: '2x',
      onClick: () => setHorizontal((state) => ({ ...state, speedFactor: 2 })),
    },
  ];
  const verticalDirectionControls: ControlOption[] = [
    {
      active: vertical.direction === 'up',
      label: 'up',
      onClick: () => setVertical((state) => ({ ...state, direction: 'up' })),
    },
    {
      active: vertical.direction === 'down',
      label: 'down',
      onClick: () => setVertical((state) => ({ ...state, direction: 'down' })),
    },
  ];
  const verticalEdgeSizeControls: ControlOption[] = [
    {
      active: verticalEdgeActive && vertical.edgeHoverSize === EDGE_DEFAULT_SIZE,
      disabled: !verticalEdgeActive,
      label: '92px',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverSize: EDGE_DEFAULT_SIZE })),
    },
    {
      active: verticalEdgeActive && vertical.edgeHoverSize === EDGE_WIDE_SIZE,
      disabled: !verticalEdgeActive,
      label: '148px',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverSize: EDGE_WIDE_SIZE })),
    },
  ];
  const verticalInputControls: ControlOption[] = [
    {
      active: vertical.dragEnabled,
      label: 'drag',
      onClick: () => setVertical((state) => ({ ...state, dragEnabled: !state.dragEnabled })),
    },
    {
      active: vertical.keyboardEnabled,
      label: 'keys',
      onClick: () => setVertical((state) => ({ ...state, keyboardEnabled: !state.keyboardEnabled })),
    },
  ];
  const verticalWheelControls: ControlOption[] = [
    {
      active: verticalWheelEnabled && vertical.wheelMode === 'axis',
      disabled: verticalEdgeActive,
      label: 'axis',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'axis' })),
    },
    {
      active: verticalWheelEnabled && vertical.wheelMode === 'capture',
      disabled: verticalEdgeActive,
      label: 'capture',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'capture' })),
    },
    {
      active: vertical.wheelMode === 'off' || verticalEdgeActive,
      disabled: verticalEdgeActive,
      label: 'off',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'off' })),
    },
  ];
  const verticalModeControls: ControlOption[] = [
    {
      active: vertical.running && !vertical.edgeHoverEnabled,
      label: 'auto',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverEnabled: false, running: true })),
    },
    {
      active: verticalEdgeActive,
      label: 'edge',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverEnabled: true, running: true })),
    },
    {
      active: !vertical.running,
      label: 'pause',
      onClick: () => setVertical((state) => ({ ...state, running: false })),
    },
  ];
  const verticalSpeedControls: ControlOption[] = [
    {
      active: vertical.speedFactor === 1,
      label: '1x',
      onClick: () => setVertical((state) => ({ ...state, speedFactor: 1 })),
    },
    {
      active: vertical.speedFactor === 2,
      label: '2x',
      onClick: () => setVertical((state) => ({ ...state, speedFactor: 2 })),
    },
  ];

  return (
    <main className="sway-shell">
      <section className="mosaic-arrangement" aria-label="ReactSway feature showcase" data-grid-system="true">
        <article className="mosaic-cell control-cell layout-horizontal-controls">
          <AxisToolbar title={SHOWCASE.horizontal.label} titleId="horizontal-title">
            <ControlCluster ariaLabel="Horizontal mode controls" controls={horizontalModeControls} label="mode" />
            <ControlCluster ariaLabel="Horizontal edge size controls" controls={horizontalEdgeSizeControls} label="edge" />
            <ControlCluster ariaLabel="Horizontal direction controls" controls={horizontalDirectionControls} label="direction" />
            <ControlCluster ariaLabel="Horizontal speed controls" controls={horizontalSpeedControls} label="speed" />
            <ControlCluster ariaLabel="Horizontal wheel mode controls" controls={horizontalWheelControls} label="wheel" />
            <ControlCluster ariaLabel="Horizontal input controls" controls={horizontalInputControls} label="input" />
          </AxisToolbar>
        </article>

        <article className="mosaic-cell control-cell layout-vertical-controls">
          <AxisToolbar title={SHOWCASE.vertical.label} titleId="vertical-title">
            <ControlCluster ariaLabel="Vertical mode controls" controls={verticalModeControls} label="mode" />
            <ControlCluster ariaLabel="Vertical edge size controls" controls={verticalEdgeSizeControls} label="edge" />
            <ControlCluster ariaLabel="Vertical direction controls" controls={verticalDirectionControls} label="direction" />
            <ControlCluster ariaLabel="Vertical speed controls" controls={verticalSpeedControls} label="speed" />
            <ControlCluster ariaLabel="Vertical wheel mode controls" controls={verticalWheelControls} label="wheel" />
            <ControlCluster ariaLabel="Vertical input controls" controls={verticalInputControls} label="input" />
          </AxisToolbar>
        </article>

        <article
          className="mosaic-cell mosaic-flush-cell media-cell layout-horizontal-axis"
          aria-labelledby="horizontal-title"
          style={horizontalStyle}
        >
          <SwayTrack
            autoScroll={horizontal.running}
            direction={horizontal.direction}
            draggable={horizontal.dragEnabled}
            edgeHoverEnabled={horizontalEdgeActive}
            edgeHoverSize={horizontal.edgeHoverSize}
            keyboard={horizontal.keyboardEnabled}
            showcaseCase={SHOWCASE.horizontal}
            speed={horizontalSpeed}
            wheelEnabled={horizontalWheelEnabled}
            wheelMode={horizontalWheelMode}
          >
            {POSTS.map((post) => (
              <MediaTile key={`horizontal-${post.title}`} post={post} />
            ))}
          </SwayTrack>
        </article>

        <article
          className="mosaic-cell text-cell layout-vertical-axis"
          aria-labelledby="vertical-title"
          style={verticalStyle}
        >
          <SwayTrack
            autoScroll={vertical.running}
            direction={vertical.direction}
            draggable={vertical.dragEnabled}
            edgeHoverEnabled={verticalEdgeActive}
            edgeHoverSize={vertical.edgeHoverSize}
            keyboard={vertical.keyboardEnabled}
            showcaseCase={SHOWCASE.vertical}
            speed={verticalSpeed}
            wheelEnabled={verticalWheelEnabled}
            wheelMode={verticalWheelMode}
          >
            {TEXT_POSTS.map((post) => (
              <TextPost key={`vertical-${post.meta}-${post.title}`} post={post} />
            ))}
          </SwayTrack>
        </article>

        <article className="mosaic-cell static-square-cell layout-square-upper-right" aria-hidden="true" />
        <article className="mosaic-cell static-square-cell layout-square-lower-right" aria-hidden="true" />

      </section>
    </main>
  );
}

export default App;
