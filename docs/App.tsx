/**
 * Demo page for the ReactSway feature matrix in the documentation app.
 */
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
  ReactSway,
  type ReactSwayHandle,
  type SwayAxis,
  type SwayDirection,
  type SwayWheelMode,
} from 'react-sway';
import { ArchClip, RoundedLeftClip } from 'react-veil';

import { PretextProvider, PretextText } from './pretext';

import 'react-veil/style.css';
import './index.css';

type EdgeName = 'bottom' | 'left' | 'right' | 'top';
type ExternalInputSource = 'idle' | 'pointer' | 'wheel';
type VeilShape = 'arch' | 'rounded-left';
type DemoWheelMode = SwayWheelMode | 'off';

interface HorizontalPanelState {
  direction: Extract<SwayDirection, 'left' | 'right'>;
  dragEnabled: boolean;
  keyboardEnabled: boolean;
  speedFactor: 1 | 2;
}

interface VerticalPanelState {
  direction: Extract<SwayDirection, 'down' | 'up'>;
  edgeHoverSize: number;
  edgeHoverEnabled: boolean;
  running: boolean;
  wheelMode: DemoWheelMode;
}

interface ControlOption {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}

interface StatusValue {
  active: boolean;
  label: string;
}

interface DemoPost {
  body: string;
  image: string;
  mediaCardRatio: number;
  meta: string;
  sequenceRole?: 'cover';
  title: string;
  veilShape: VeilShape;
}

interface ShowcaseCase {
  axis: SwayAxis;
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

// Twelve slots give a deterministic shuffle with equal cardinality for both Veil shapes.
const VEIL_SHAPE_SEQUENCE: VeilShape[] = [
  'arch',
  'rounded-left',
  'arch',
  'rounded-left',
  'arch',
  'rounded-left',
  'arch',
  'rounded-left',
  'arch',
  'rounded-left',
  'arch',
  'rounded-left',
];

function getVeilShape(index: number): VeilShape {
  return VEIL_SHAPE_SEQUENCE[index % VEIL_SHAPE_SEQUENCE.length];
}

function getSequenceMeta(index: number, total: number) {
  return index === 0 ? '01 cover' : `${String(index + 1).padStart(2, '0')} / ${total}`;
}

const POSTS: DemoPost[] = [
  {
    body:
      'Before the screen, the page had the dignity of a frontier. It could be weighed in the hand, counted, folded, exhausted. Then came the luminous surface, and with it a quieter empire: the document ceased to be a sheet and became a country through which the eye descended, obedient and restless, as if memory itself had been given corridors without doors.',
    image: IMAGE_SOURCES[0],
    mediaCardRatio: 2.2,
    meta: getSequenceMeta(0, IMAGE_SOURCES.length),
    sequenceRole: 'cover',
    title: 'The page gives way',
    veilShape: getVeilShape(0),
  },
  {
    body:
      'The scrollbar first appeared with the modesty of a servant and the authority of a magistrate. Thin, pale, almost apologetic, it stood beside the window and revealed a shocking truth: what the user saw was only a portion of the world, and below that visible chamber another province waited in silence, already written, already demanding to be reached.',
    image: IMAGE_SOURCES[1],
    mediaCardRatio: 1.86,
    meta: getSequenceMeta(1, IMAGE_SOURCES.length),
    title: 'The narrow witness',
    veilShape: getVeilShape(1),
  },
  {
    body:
      'When the mouse wheel entered daily life, no trumpet announced it. A finger merely bent, and the page obeyed. Yet in that small motion there was a change of civilization, for the reader no longer turned from one bounded surface to another; he slipped through a vertical season of facts, errands, messages, promises, and weariness.',
    image: IMAGE_SOURCES[2],
    mediaCardRatio: 2.08,
    meta: getSequenceMeta(2, IMAGE_SOURCES.length),
    title: "The wheel's descent",
    veilShape: getVeilShape(2),
  },
  {
    body:
      'The hand, once trained by paper to lift and separate, learned a new humility before glass. It dragged, tapped, hesitated, returned. Beneath this choreography lay a moral ambiguity: the interface gave man more freedom than the page, and at the same time taught him to accept an obedience more continuous, more intimate, more difficult to refuse.',
    image: IMAGE_SOURCES[3],
    mediaCardRatio: 2.5,
    meta: getSequenceMeta(3, IMAGE_SOURCES.length),
    title: 'The obedient hand',
    veilShape: getVeilShape(3),
  },
  {
    body:
      'The early graphical window was less a machine than a room lit at night. Inside it, lists opened, letters waited, ledgers extended beyond the lower edge, and the cursor hovered like a nervous visitor. To scroll was to admit that the visible world was provisional, that truth might be hiding a few inches beneath the eye.',
    image: IMAGE_SOURCES[4],
    mediaCardRatio: 1.74,
    meta: getSequenceMeta(4, IMAGE_SOURCES.length),
    title: 'Rooms of light',
    veilShape: getVeilShape(4),
  },
  {
    body:
      'Later, the feed arrived and abolished the old consolation of an ending. It offered news, faces, grief, amusement, commerce, confession, and spectacle in one descending procession. The user believed he was choosing, but the stream had already chosen the form of his attention: forward, downward, onward, without ceremony.',
    image: IMAGE_SOURCES[5],
    mediaCardRatio: 2.33,
    meta: getSequenceMeta(5, IMAGE_SOURCES.length),
    title: 'The endless procession',
    veilShape: getVeilShape(5),
  },
  {
    body:
      'There was grandeur in this fatigue. The glowing monitor did not merely display information; it asked the mind to inhabit motion as a habit, to accept knowledge as a passage rather than a possession. At the edge of the viewport, where content disappeared, modern man discovered both his impatience and his longing for completion.',
    image: IMAGE_SOURCES[6],
    mediaCardRatio: 1.98,
    meta: getSequenceMeta(6, IMAGE_SOURCES.length),
    title: 'Fatigue and light',
    veilShape: getVeilShape(6),
  },
];

const EXTERNAL_INPUT_EDGE_HOVER_SIZE_PX = 72;
const VERTICAL_TEXT_CYCLE_COUNT = 12;

const TEXT_POSTS: DemoPost[] = Array.from({ length: VERTICAL_TEXT_CYCLE_COUNT }, (_, cycleIndex) =>
  POSTS.map((post, postIndex) => {
    const sequenceNumber = cycleIndex * POSTS.length + postIndex + 1;

    return {
      ...post,
      body: `${post.body} Each return of the passage renews the same historical bargain: the machine offers continuity, and the reader, half sovereign and half captive, follows the movement until the boundary between seeking and surrender becomes almost impossible to name.`,
      meta: getSequenceMeta(sequenceNumber - 1, POSTS.length * VERTICAL_TEXT_CYCLE_COUNT),
      sequenceRole: sequenceNumber === 1 ? 'cover' : undefined,
      veilShape: getVeilShape(sequenceNumber - 1),
    };
  }),
).flat();

const EXTERNAL_INPUT_POSTS: DemoPost[] = POSTS.map((post, postIndex) => ({
  ...post,
  body: `${post.body} The external input route keeps pointer capture outside the Sway runtime while the imperative handle receives edge intent as a continuous signal.`,
  meta: getSequenceMeta(postIndex, POSTS.length),
  sequenceRole: postIndex === 0 ? 'cover' : undefined,
  veilShape: getVeilShape(postIndex + 2),
}));

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

function getHorizontalDescription(state: HorizontalPanelState) {
  const direction = state.direction === 'left' ? 'left' : 'right';
  const speed = state.speedFactor === 1 ? 'standard speed' : 'double speed';
  const directInput = state.dragEnabled && state.keyboardEnabled
    ? 'Drag it sideways or use the arrow keys.'
    : state.dragEnabled
      ? 'Drag it sideways.'
      : state.keyboardEnabled
        ? 'Use the arrow keys to move it sideways.'
        : 'Direct control is off.';

  return `The rail moves ${direction} at ${speed}. ${directInput} Vertical swipes still scroll the page.`;
}

function getVerticalDescription(
  state: VerticalPanelState,
  edgeActive: boolean,
  wheelEnabled: boolean,
) {
  const motion = !state.running
    ? 'Automatic motion is paused.'
    : edgeActive
      ? 'Hover near the top or bottom edge to move the stream in that direction.'
      : `The stream moves ${state.direction === 'up' ? 'upward' : 'downward'} automatically.`;

  if (edgeActive) {
    return `${motion} Wheel input is disabled in edge mode; touch continues to scroll the page.`;
  }

  if (!wheelEnabled) {
    return `${motion} Wheel and touch input continue to scroll the page.`;
  }

  if (state.wheelMode === 'capture') {
    return `${motion} All wheel movement drives the stream; use the right-hand lane to scroll the page. Touch still scrolls the page.`;
  }

  return `${motion} Vertical wheel movement can also drive the stream; sideways wheel movement and touch stay with the page.`;
}

function getExternalRoutingDescription({
  edgeIntent,
  edgeSize,
  edgeSpeedMultiplier,
  holding,
  inputSource,
}: {
  edgeIntent: 'idle' | 'left' | 'right';
  edgeSize: number;
  edgeSpeedMultiplier: number;
  holding: boolean;
  inputSource: ExternalInputSource;
}) {
  const edgeZone = `${edgeSize}-pixel`;
  const acceleration = `${edgeSpeedMultiplier}x`;

  if (!holding) {
    return `${edgeZone} edge zones are ready with a ${acceleration} speed cap. Hold with a mouse to route input; touch scrolls the page.`;
  }

  if (inputSource === 'wheel') {
    return 'Wheel input is routed through the surface. Release the pointer to return control to the page.';
  }

  if (edgeIntent === 'idle') {
    return `Pointer routing is active outside both ${edgeZone} zones. Move toward an edge or use the wheel.`;
  }

  return `The ${edgeIntent} ${edgeZone} zone is accelerating toward the ${acceleration} cap. Release the pointer to stop routing input.`;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Renders one semantic cluster of controls for a single Sway instance.
 */
function ControlCluster({ ariaLabel, controls, label }: { ariaLabel: string; controls: ControlOption[]; label: string }) {
  const disabled = controls.every((control) => control.disabled);

  return (
    <div className="control-cluster" data-disabled={disabled} role="group" aria-label={ariaLabel}>
      <span className="control-cluster-label" aria-hidden="true">
        <PretextText inline profile="uiLabel" text={label} />
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
            <PretextText inline profile="uiButton" text={control.label} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders passive runtime state with the same visual grammar as control clusters.
 */
function StatusCluster({ ariaLabel, label, values }: { ariaLabel: string; label: string; values: StatusValue[] }) {
  return (
    <div className="control-cluster status-cluster" data-disabled="false" role="group" aria-label={ariaLabel}>
      <span className="control-cluster-label" aria-hidden="true">
        <PretextText inline profile="uiLabel" text={label} />
      </span>
      <div className="control-buttons status-values">
        {values.map((value) => (
          <span className="status-value" data-active={value.active} key={value.label}>
            <PretextText inline profile="uiButton" text={value.label} />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders one interaction profile with concise guidance and its controls.
 */
function AxisToolbar({
  children,
  description,
  title,
  titleId,
}: {
  children: ReactNode;
  description: string;
  title: string;
  titleId: string;
}) {
  const descriptionId = `${titleId}-description`;

  return (
    <section className="axis-toolbar" aria-describedby={descriptionId} aria-labelledby={titleId}>
      <h2 id={titleId}>
        <PretextText inline profile="uiTitle" text={title} />
      </h2>
      <p aria-atomic="true" aria-live="polite" className="axis-toolbar-description" id={descriptionId}>
        <PretextText profile="uiDescription" text={description} />
      </p>
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
      <h3>
        <PretextText profile="display" text={post.title} />
      </h3>
      <p>
        <PretextText profile="body" text={post.body} />
      </p>
    </div>
  );
}

/**
 * Renders one of the allowed Veil clip shapes while preserving a shared media contract.
 */
function VeilClip({ children, shape }: { children: ReactNode; shape: VeilShape }) {
  if (shape === 'arch') {
    return <ArchClip className="post-image-veil">{children}</ArchClip>;
  }

  return <RoundedLeftClip className="post-image-veil">{children}</RoundedLeftClip>;
}

/**
 * Renders a clipped image frame used by both Sway axes.
 */
function PostImageFrame({ post }: { post: DemoPost }) {
  return (
    <figure className="post-image-frame">
      <span className="post-image-index" data-sequence-role={post.sequenceRole ?? 'item'}>
        <PretextText inline profile="cardMeta" text={post.meta} />
      </span>
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
 * Demonstrates external input routing when another surface owns pointer capture.
 */
function ExternalInputRoutingExample() {
  const [edgeIntent, setEdgeIntent] = useState<'idle' | 'left' | 'right'>('idle');
  const [edgeSize, setEdgeSize] = useState(EXTERNAL_INPUT_EDGE_HOVER_SIZE_PX);
  const [inputSource, setInputSource] = useState<ExternalInputSource>('idle');
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const railFrameRef = useRef<HTMLDivElement>(null);
  const swayRef = useRef<ReactSwayHandle | null>(null);
  const description = getExternalRoutingDescription({
    edgeIntent,
    edgeSize,
    edgeSpeedMultiplier: DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER,
    holding,
    inputSource,
  });

  const updateEdgeIntent = useCallback((clientX: number) => {
    const railFrame = railFrameRef.current;
    if (!railFrame) {
      setEdgeIntent('idle');
      return;
    }

    const rect = railFrame.getBoundingClientRect();
    const effectiveEdgeSize = Math.min(edgeSize, rect.width / 2);
    const nextIntent = clientX <= rect.left + effectiveEdgeSize
      ? 'left'
      : clientX >= rect.right - effectiveEdgeSize
        ? 'right'
        : 'idle';

    setEdgeIntent((previousIntent) => (previousIntent === nextIntent ? previousIntent : nextIntent));
  }, [edgeSize]);

  const routePointerIntent = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    swayRef.current?.handleEdgeHover({
      clientX: event.clientX,
      clientY: event.clientY,
    });
    setInputSource('pointer');
    updateEdgeIntent(event.clientX);
  }, [updateEdgeIntent]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdingRef.current = true;
    setHolding(true);
    routePointerIntent(event);
  }, [routePointerIntent]);

  const finishPointerHold = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    holdingRef.current = false;
    setHolding(false);
    setEdgeIntent('idle');
    setInputSource('idle');
    swayRef.current?.clearEdgeHover();
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!holdingRef.current) return;
    routePointerIntent(event);
  }, [routePointerIntent]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    if (!holdingRef.current) return;
    setInputSource('wheel');
    swayRef.current?.handleWheel(event.nativeEvent);
  }, []);

  const externalEdgeSizeControls: ControlOption[] = [
    {
      active: edgeSize === EXTERNAL_INPUT_EDGE_HOVER_SIZE_PX,
      label: '72px',
      onClick: () => setEdgeSize(EXTERNAL_INPUT_EDGE_HOVER_SIZE_PX),
    },
    {
      active: edgeSize === EDGE_DEFAULT_SIZE,
      label: '92px',
      onClick: () => setEdgeSize(EDGE_DEFAULT_SIZE),
    },
    {
      active: edgeSize === EDGE_WIDE_SIZE,
      label: '148px',
      onClick: () => setEdgeSize(EDGE_WIDE_SIZE),
    },
  ];

  return (
    <>
      <article className="mosaic-cell control-cell layout-bridge-controls">
        <AxisToolbar
          description={description}
          title="external routing"
          titleId="external-input-title"
        >
          <ControlCluster
            ariaLabel="External input edge size controls"
            controls={externalEdgeSizeControls}
            label="edge zone"
          />
          <StatusCluster
            ariaLabel="External input source state"
            label="input"
            values={[
              { active: inputSource === 'idle', label: 'ready' },
              { active: inputSource === 'pointer', label: 'pointer' },
              { active: inputSource === 'wheel', label: 'wheel' },
            ]}
          />
          <StatusCluster
            ariaLabel="External input edge intent state"
            label="motion"
            values={[
              { active: edgeIntent === 'left', label: 'left' },
              { active: edgeIntent === 'idle', label: 'still' },
              { active: edgeIntent === 'right', label: 'right' },
            ]}
          />
        </AxisToolbar>
      </article>

      <section
        aria-describedby="external-input-title-description"
        aria-labelledby="external-input-title"
        className="mosaic-cell mosaic-flush-cell bridge-cell layout-bridge-demo"
        data-edge-intent={edgeIntent}
        data-holding={holding}
      >
        <div
          aria-label="Hold this horizontal Sway surface to route pointer and wheel intent into ReactSway"
          className="sway-stage horizontal-stage bridge-stage"
          data-sway-mode="edge"
          onPointerCancel={finishPointerHold}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerHold}
          onWheel={handleWheel}
          ref={railFrameRef}
          role="group"
          style={{ '--edge-size': `${edgeSize}px` } as CSSProperties}
        >
          {SHOWCASE.horizontal.edges.map((edge) => (
            <div
              aria-hidden="true"
              className={`edge-indicator edge-indicator-${edge}`}
              key={`external-input-${edge}`}
            />
          ))}
          <ReactSway
            axis="horizontal"
            autoScroll={false}
            direction="left"
             draggable={false}
             edgeHoverInputMode="external"
            edgeHoverScroll
            edgeHoverSize={edgeSize}
            edgeHoverSpeedMultiplier={DEFAULT_EDGE_HOVER_SPEED_MULTIPLIER}
            keyboard={false}
            lazy={false}
            ref={swayRef}
            resumeDelay={500}
            speed={0.82}
            wheelMode="axis"
          >
            {EXTERNAL_INPUT_POSTS.map((post) => (
              <MediaTile key={`external-input-${post.meta}-${post.title}`} post={post} />
            ))}
          </ReactSway>
        </div>
      </section>
    </>
  );
}

/**
 * Renders the docs app used to inspect every public ReactSway interaction mode.
 */
function App() {
  const finePointerShowcase = useMediaQuery('(hover: hover) and (pointer: fine)');
  const desktopWheelShowcase = useMediaQuery('(hover: hover) and (pointer: fine) and (min-width: 860px)');
  const [horizontal, setHorizontal] = useState<HorizontalPanelState>({
    direction: 'left',
    dragEnabled: true,
    keyboardEnabled: true,
    speedFactor: 1,
  });
  const [vertical, setVertical] = useState<VerticalPanelState>({
    direction: 'up',
    edgeHoverSize: EDGE_DEFAULT_SIZE,
    edgeHoverEnabled: false,
    running: true,
    wheelMode: 'off',
  });

  const verticalEdgeActive = finePointerShowcase && vertical.running && vertical.edgeHoverEnabled;
  const verticalWheelEnabled = desktopWheelShowcase && vertical.wheelMode !== 'off' && !verticalEdgeActive;
  const verticalWheelMode = vertical.wheelMode === 'capture' ? 'capture' : 'axis';
  const horizontalSpeed = SHOWCASE.horizontal.baseSpeed * horizontal.speedFactor;
  const horizontalDescription = getHorizontalDescription(horizontal);
  const verticalDescription = getVerticalDescription(vertical, verticalEdgeActive, verticalWheelEnabled);
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
  const verticalModeControls: ControlOption[] = [
    {
      active: vertical.running && !verticalEdgeActive,
      label: 'auto',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverEnabled: false, running: true })),
    },
    {
      active: verticalEdgeActive,
      disabled: !finePointerShowcase,
      label: 'edge',
      onClick: () => setVertical((state) => ({ ...state, edgeHoverEnabled: true, running: true })),
    },
    {
      active: !vertical.running,
      label: 'pause',
      onClick: () => setVertical((state) => ({ ...state, running: false })),
    },
  ];
  const verticalWheelControls: ControlOption[] = [
    {
      active: verticalWheelEnabled && vertical.wheelMode === 'axis',
      disabled: verticalEdgeActive || !desktopWheelShowcase,
      label: 'axis',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'axis' })),
    },
    {
      active: verticalWheelEnabled && vertical.wheelMode === 'capture',
      disabled: verticalEdgeActive || !desktopWheelShowcase,
      label: 'all',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'capture' })),
    },
    {
      active: !desktopWheelShowcase || vertical.wheelMode === 'off' || verticalEdgeActive,
      disabled: verticalEdgeActive,
      label: 'page',
      onClick: () => setVertical((state) => ({ ...state, wheelMode: 'off' })),
    },
  ];
  return (
    <PretextProvider>
      <main className="sway-shell">
        <section className="mosaic-arrangement" aria-label="ReactSway feature showcase" data-grid-system="true">
          <article className="mosaic-cell control-cell layout-horizontal-controls">
            <AxisToolbar
              description={horizontalDescription}
              title="horizontal rail"
              titleId="horizontal-title"
            >
              <ControlCluster
                ariaLabel="Horizontal direction controls"
                controls={horizontalDirectionControls}
                label="direction"
              />
              <ControlCluster ariaLabel="Horizontal speed controls" controls={horizontalSpeedControls} label="speed" />
              <ControlCluster ariaLabel="Horizontal input controls" controls={horizontalInputControls} label="control" />
            </AxisToolbar>
          </article>

          <article className="mosaic-cell control-cell layout-vertical-controls">
            <AxisToolbar
              description={verticalDescription}
              title="vertical stream"
              titleId="vertical-title"
            >
              <ControlCluster
                ariaLabel="Vertical direction controls"
                controls={verticalDirectionControls}
                label="direction"
              />
              <ControlCluster ariaLabel="Vertical mode controls" controls={verticalModeControls} label="motion" />
              <ControlCluster ariaLabel="Vertical wheel mode controls" controls={verticalWheelControls} label="wheel" />
            </AxisToolbar>
          </article>

          <article
            aria-describedby="horizontal-title-description"
            className="mosaic-cell mosaic-flush-cell media-cell layout-horizontal-axis"
            aria-labelledby="horizontal-title"
          >
            <SwayTrack
              autoScroll
              direction={horizontal.direction}
              draggable={horizontal.dragEnabled}
              keyboard={horizontal.keyboardEnabled}
              showcaseCase={SHOWCASE.horizontal}
              speed={horizontalSpeed}
              wheelEnabled={false}
            >
              {POSTS.map((post) => (
                <MediaTile key={`horizontal-${post.title}`} post={post} />
              ))}
            </SwayTrack>
          </article>

          <article
            aria-describedby="vertical-title-description"
            className="mosaic-cell text-cell layout-vertical-axis"
            aria-labelledby="vertical-title"
          >
            <SwayTrack
              autoScroll={vertical.running}
              direction={vertical.direction}
              draggable={false}
              edgeHoverEnabled={verticalEdgeActive}
              edgeHoverSize={vertical.edgeHoverSize}
              keyboard={false}
              showcaseCase={SHOWCASE.vertical}
              wheelEnabled={verticalWheelEnabled}
              wheelMode={verticalWheelMode}
            >
              {TEXT_POSTS.map((post) => (
                <TextPost key={`vertical-${post.meta}-${post.title}`} post={post} />
              ))}
            </SwayTrack>
          </article>

          <ExternalInputRoutingExample />

        </section>
        <aside aria-hidden="true" className="page-scroll-lane" />
      </main>
    </PretextProvider>
  );
}

export default App;
