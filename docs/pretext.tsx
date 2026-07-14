/**
 * Adapts Pretext measurement and line layout to semantic React demo copy.
 */
import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  layoutWithLines,
  prepareWithSegments,
  type PrepareOptions,
  type PreparedTextWithSegments,
} from '@chenglou/pretext';

type PretextProfileName =
  | 'body'
  | 'cardMeta'
  | 'display'
  | 'uiButton'
  | 'uiDescription'
  | 'uiLabel'
  | 'uiTitle';

interface PretextProfile {
  font: string;
  lineHeight: number;
  options?: PrepareOptions;
  singleLine?: boolean;
  textTransform?: 'uppercase';
}

interface ResolvedPretextProfile {
  font: string;
  lineHeight: number;
  options?: PrepareOptions;
}

const PRETEXT_FONT_LOAD_QUERIES = ['16px Brawler', '12px Geist'];
const PRETEXT_PROFILES: Record<PretextProfileName, PretextProfile> = {
  body: {
    font: '400 16px Brawler',
    lineHeight: 24,
  },
  cardMeta: {
    font: '680 12px Geist',
    lineHeight: 14,
    singleLine: true,
    textTransform: 'uppercase',
  },
  display: {
    font: '400 27px Brawler',
    lineHeight: 30,
  },
  uiButton: {
    font: '520 12px Geist',
    lineHeight: 14,
    singleLine: true,
  },
  uiDescription: {
    font: '460 12px Geist',
    lineHeight: 17,
  },
  uiLabel: {
    font: '560 12px Geist',
    lineHeight: 14,
    singleLine: true,
  },
  uiTitle: {
    font: '680 12px Geist',
    lineHeight: 14,
    singleLine: true,
  },
};

const PretextFontsReadyContext = createContext(true);
const preparedTextCache = new Map<string, PreparedTextWithSegments>();

function getPretextCacheKey(text: string, profile: ResolvedPretextProfile) {
  const options = profile.options
    ? `${profile.options.whiteSpace ?? 'normal'}:${profile.options.wordBreak ?? 'normal'}:${profile.options.letterSpacing ?? 0}`
    : 'normal:normal:0';

  return `${profile.font}|${options}|${text}`;
}

function normalizePretextText(text: string, profile: PretextProfile) {
  return profile.textTransform === 'uppercase' ? text.toLocaleUpperCase() : text;
}

function getPreparedPretextText(text: string, profile: ResolvedPretextProfile) {
  const cacheKey = getPretextCacheKey(text, profile);
  const cached = preparedTextCache.get(cacheKey);

  if (cached) return cached;

  const prepared = prepareWithSegments(text, profile.font, profile.options);
  preparedTextCache.set(cacheKey, prepared);
  return prepared;
}

function getComputedPretextFont(computedStyle: CSSStyleDeclaration, fallbackFont: string) {
  const computedFont = [
    computedStyle.fontStyle !== 'normal' ? computedStyle.fontStyle : '',
    computedStyle.fontWeight !== '400' && computedStyle.fontWeight !== 'normal'
      ? computedStyle.fontWeight
      : '',
    computedStyle.fontSize && computedStyle.fontFamily
      ? `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return computedFont || fallbackFont;
}

function getComputedPretextOptions(
  computedStyle: CSSStyleDeclaration,
  fallbackOptions: PrepareOptions | undefined,
) {
  const options: PrepareOptions = { ...(fallbackOptions ?? {}) };
  const letterSpacing = Number.parseFloat(computedStyle.letterSpacing);

  if (Number.isFinite(letterSpacing)) {
    options.letterSpacing = letterSpacing;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

function getComputedPretextProfile(
  element: HTMLElement,
  fallbackProfile: PretextProfile,
): ResolvedPretextProfile {
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight);

  return {
    font: getComputedPretextFont(computedStyle, fallbackProfile.font),
    lineHeight: Number.isFinite(lineHeight) && lineHeight > 0
      ? lineHeight
      : fallbackProfile.lineHeight,
    options: getComputedPretextOptions(computedStyle, fallbackProfile.options),
  };
}

function arePretextOptionsEqual(
  left: PrepareOptions | undefined,
  right: PrepareOptions | undefined,
) {
  return (
    (left?.letterSpacing ?? 0) === (right?.letterSpacing ?? 0) &&
    (left?.whiteSpace ?? 'normal') === (right?.whiteSpace ?? 'normal') &&
    (left?.wordBreak ?? 'normal') === (right?.wordBreak ?? 'normal')
  );
}

function areResolvedPretextProfilesEqual(
  left: ResolvedPretextProfile,
  right: ResolvedPretextProfile,
) {
  return (
    left.font === right.font &&
    left.lineHeight === right.lineHeight &&
    arePretextOptionsEqual(left.options, right.options)
  );
}

function useDocumentFontsReady() {
  const [ready, setReady] = useState(() => (
    typeof document === 'undefined' || !('fonts' in document)
  ));

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;

    let active = true;
    const fontSet = document.fonts;
    const explicitFontLoads = PRETEXT_FONT_LOAD_QUERIES.map((font) => fontSet.load(font));

    Promise.all([...explicitFontLoads, fontSet.ready])
      .then(() => {
        if (!active) return;
        preparedTextCache.clear();
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return ready;
}

function useElementInlineSize<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement | null>(null);
  const [inlineSize, setInlineSize] = useState(0);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateInlineSize = (nextInlineSize: number) => {
      setInlineSize((previousInlineSize) => (
        Math.abs(previousInlineSize - nextInlineSize) < 0.5
          ? previousInlineSize
          : nextInlineSize
      ));
    };
    updateInlineSize(element.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) updateInlineSize(entry.contentRect.width);
    });
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [elementRef, inlineSize] as const;
}

function useResolvedPretextProfile<TElement extends HTMLElement>(
  elementRef: { current: TElement | null },
  fallbackProfile: PretextProfile,
  fontsReady: boolean,
  inlineSize: number,
) {
  const [resolvedProfile, setResolvedProfile] = useState<ResolvedPretextProfile>(() => ({
    font: fallbackProfile.font,
    lineHeight: fallbackProfile.lineHeight,
    options: fallbackProfile.options,
  }));

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!fontsReady || !element || typeof window === 'undefined') return;

    const nextProfile = getComputedPretextProfile(element, fallbackProfile);
    setResolvedProfile((previousProfile) => (
      areResolvedPretextProfilesEqual(previousProfile, nextProfile)
        ? previousProfile
        : nextProfile
    ));
  }, [elementRef, fallbackProfile, fontsReady, inlineSize]);

  return resolvedProfile;
}

/** Supplies the font-readiness state shared by all measured demo copy. */
export function PretextProvider({ children }: { children: ReactNode }) {
  const fontsReady = useDocumentFontsReady();

  return (
    <PretextFontsReadyContext.Provider value={fontsReady}>
      {children}
    </PretextFontsReadyContext.Provider>
  );
}

/** Renders visible copy through Pretext while preserving semantic wrappers. */
export function PretextText({
  className,
  inline = false,
  profile: profileName,
  text,
}: {
  className?: string;
  inline?: boolean;
  profile: PretextProfileName;
  text: string;
}) {
  const fontsReady = useContext(PretextFontsReadyContext);
  const [elementRef, inlineSize] = useElementInlineSize<HTMLSpanElement>();
  const profile = PRETEXT_PROFILES[profileName];
  const resolvedProfile = useResolvedPretextProfile(elementRef, profile, fontsReady, inlineSize);
  const displayText = useMemo(() => normalizePretextText(text, profile), [profile, text]);
  const prepared = useMemo(
    () => (fontsReady ? getPreparedPretextText(displayText, resolvedProfile) : null),
    [displayText, fontsReady, resolvedProfile],
  );
  const layoutEngine = profile.singleLine
    ? 'single-line'
    : prepared && inlineSize > 0
      ? 'pretext'
      : 'pending';
  const laidOutLines = useMemo(() => {
    if (!prepared || inlineSize <= 0 || profile.singleLine) return [displayText];

    const result = layoutWithLines(
      prepared,
      Math.max(1, inlineSize),
      resolvedProfile.lineHeight,
    );
    return result.lines.length > 0
      ? result.lines.map((line) => line.text.trimEnd())
      : [displayText];
  }, [displayText, inlineSize, prepared, profile.singleLine, resolvedProfile.lineHeight]);

  return (
    <span
      className={className ? `pretext-text ${className}` : 'pretext-text'}
      data-inline={inline}
      data-layout-engine={layoutEngine}
      data-line-count={laidOutLines.length}
      data-profile={profileName}
      ref={elementRef}
      style={{ '--pretext-line-height': `${resolvedProfile.lineHeight}px` } as CSSProperties}
    >
      {laidOutLines.map((line, lineIndex) => (
        <span className="pretext-line" key={`${lineIndex}-${line}`}>
          {line || '\u00a0'}
        </span>
      ))}
    </span>
  );
}
