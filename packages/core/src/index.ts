/**
 * @premirror/core — public contracts for Premirror (Milestone 1).
 */

// --- Shared primitives -------------------------------------------------------

export type Rect = { x: number; y: number; width: number; height: number };

export type Interval = { start: number; end: number };

export type PagePreset = "letter" | "a4";

export type PageSpec = {
  widthPx: number;
  heightPx: number;
  preset?: PagePreset;
};

export type PageMargins = {
  topPx: number;
  rightPx: number;
  bottomPx: number;
  leftPx: number;
};

export type TypographyConfig = {
  defaultFont: string;
  defaultLineHeightPx: number;
  tabSize?: number;
};

export type LayoutPolicyConfig = {
  widowLinesMin?: number;
  orphanLinesMin?: number;
  keepWithNextEnabled?: boolean;
  minSlotWidthPx?: number;
  slotSelectionPolicy?: "single_slot_flow" | "multi_slot_fill";
};

export type PremirrorOptions = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies?: LayoutPolicyConfig;
  features?: Record<string, boolean>;
};

// --- Snapshot model ----------------------------------------------------------

export type ResolvedMarkSet = {
  strong?: boolean;
  em?: boolean;
  code?: boolean;
  linkHref?: string;
};

export type StyledRun = {
  id: string;
  text: string;
  font: string;
  marks: ResolvedMarkSet;
  pmRange: { from: number; to: number };
  atomic?: boolean;
};

export type BlockSnapshot = {
  id: string;
  type: "paragraph" | "heading" | "blockquote";
  attrs: Record<string, unknown>;
  runs: StyledRun[];
  pmRange: { from: number; to: number };
};

export type UnmeasuredDocumentSnapshot = {
  blocks: BlockSnapshot[];
};

export type MeasuredRun = {
  runId: string;
  prepared: unknown;
  widthPx?: number;
  textLength?: number;
};

export type MeasuredDocumentSnapshot = UnmeasuredDocumentSnapshot & {
  measuredRuns: Record<string, MeasuredRun>;
};

// --- Layout model ------------------------------------------------------------

export type BreakReason =
  | "frame_overflow"
  | "manual_page_break"
  | "keep_with_next"
  | "widow_orphan_protection";

export type PlacedRun = {
  runId: string;
  text: string;
  font: string;
  marks: ResolvedMarkSet;
  x: number;
  width: number;
  pmRange: { from: number; to: number };
};

export type LineBox = {
  y: number;
  height: number;
  runs: PlacedRun[];
  pmRange: { from: number; to: number };
};

export type BlockFragment = {
  blockId: string;
  fragmentIndex: number;
  pmRange: { from: number; to: number };
  lines: LineBox[];
  breakReason?: BreakReason;
};

export type FrameLayout = {
  bounds: Rect;
  fragments: BlockFragment[];
};

export type PageLayout = {
  index: number;
  spec: PageSpec;
  frames: FrameLayout[];
};

export type LayoutPoint = {
  pageIndex: number;
  frameIndex: number;
  fragmentIndex: number;
  lineIndex: number;
  offsetInLine: number;
};

export type MappingIndex = {
  pmPosToLayout: (pmPos: number) => LayoutPoint | null;
  layoutToPmPos: (point: LayoutPoint) => number | null;
};

export type ComposeMetrics = {
  extractionMs: number;
  measurementMs: number;
  composeMs: number;
  pages: number;
  blocks: number;
};

export type LayoutInput = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies: LayoutPolicyConfig;
  obstacles?: BandObstacle[];
};

export type LayoutOutput = {
  pages: PageLayout[];
  mapping: MappingIndex;
  metrics: ComposeMetrics;
};

export type ComposeWarning = {
  code: string;
  message: string;
};

export type ComposeDiagnostics = {
  warnings: ComposeWarning[];
  timings: ComposeMetrics;
};

export type ProjectedSelection = {
  pmRange: { from: number; to: number };
  rects: Rect[];
};

export type BandObstacle = {
  id: string;
  yStart: number;
  yEnd: number;
  intervalsForBand: (bandTop: number, bandBottom: number) => Interval[];
};

// --- Defaults & helpers ------------------------------------------------------

/** US Letter @ 96 DPI (common CSS px baseline). */
export const LETTER_PAGE_PX: PageSpec = {
  widthPx: 816,
  heightPx: 1056,
  preset: "letter",
};

/** ISO A4 @ 96 DPI. */
export const A4_PAGE_PX: PageSpec = {
  widthPx: 794,
  heightPx: 1123,
  preset: "a4",
};

export const DEFAULT_PAGE_MARGINS: PageMargins = {
  topPx: 96,
  rightPx: 96,
  bottomPx: 96,
  leftPx: 96,
};

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  defaultFont: "system-ui, sans-serif",
  defaultLineHeightPx: 20,
  tabSize: 4,
};

export const DEFAULT_LAYOUT_POLICIES: LayoutPolicyConfig = {
  widowLinesMin: 2,
  orphanLinesMin: 2,
  keepWithNextEnabled: true,
  minSlotWidthPx: 48,
  slotSelectionPolicy: "single_slot_flow",
};

export function pageSpecForPreset(preset: PagePreset): PageSpec {
  return preset === "a4" ? { ...A4_PAGE_PX } : { ...LETTER_PAGE_PX };
}

export function defaultPremirrorOptions(overrides?: Partial<PremirrorOptions>): PremirrorOptions {
  const page = overrides?.page ?? { ...LETTER_PAGE_PX };
  const margins = overrides?.margins ?? { ...DEFAULT_PAGE_MARGINS };
  const typography = overrides?.typography ?? { ...DEFAULT_TYPOGRAPHY };
  const policies = overrides?.policies ?? { ...DEFAULT_LAYOUT_POLICIES };
  const features = overrides?.features;
  return {
    page,
    margins,
    typography,
    policies,
    ...(features !== undefined ? { features } : {}),
  };
}

export function createLayoutInputFromOptions(options: PremirrorOptions): LayoutInput {
  return {
    page: options.page,
    margins: options.margins,
    typography: options.typography,
    policies: { ...DEFAULT_LAYOUT_POLICIES, ...options.policies },
  };
}

/** Demo bootstrap helper (kept for existing app imports). */
export function buildPremirrorBanner(): string {
  return "Premirror monorepo initialized";
}
