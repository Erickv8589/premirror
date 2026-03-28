# Premirror Proposed API Design

## Status

Draft v0.2 (post-review consistency pass).

## Purpose

Define the initial public API for Premirror packages and how they compose in a
real integration. This is the implementer-facing contract draft for Milestone 1.

## Core Design Decisions

1. Keep one canonical setup object for ProseMirror integration and snapshot
   extraction.
2. Keep measurement separate from extraction (`measureSnapshot` stays public).
3. Make composition deterministic by requiring a measured snapshot as input.
4. Make React composition pattern explicit (`PremirrorPageViewport` wraps
   `ProseMirrorDoc` as the editable layer in the same visual surface).

---

## `@premirror/core`

### Shared primitives

```ts
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
```

### Snapshot model

```ts
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
  // M1 flattens list items into paragraph-like blocks with attrs metadata.
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
};

export type MeasuredDocumentSnapshot = UnmeasuredDocumentSnapshot & {
  measuredRuns: Record<string, MeasuredRun>;
};
```

### Layout model

```ts
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
  // Region where obstacle can affect line bands.
  yStart: number;
  yEnd: number;
  // Returns blocked x-intervals for the queried band.
  intervalsForBand: (bandTop: number, bandBottom: number) => Interval[];
};
```

---

## `@premirror/composer`

### Public API

```ts
import type {
  LayoutInput,
  LayoutOutput,
  MeasuredDocumentSnapshot,
} from "@premirror/core";

export function composeLayout(
  snapshot: MeasuredDocumentSnapshot,
  previous: LayoutOutput | null,
  input: LayoutInput,
): LayoutOutput;
```

Supporting behavior:

- `slotSelectionPolicy` controls how carved slots are consumed:
  - `single_slot_flow`: choose one slot per line band (M1 default).
  - `multi_slot_fill`: fill all slots in a band (feature-flagged/deferred path).

Note:

- `evaluateBreakPolicies` is an internal composer helper and is not part of the
  public package surface in M1.

---

## `@premirror/prosemirror-adapter`

### Canonical setup object

```ts
import type { EditorState, Plugin } from "prosemirror-state";
import type {
  MeasuredDocumentSnapshot,
  PremirrorOptions,
  UnmeasuredDocumentSnapshot,
} from "@premirror/core";

export type PremirrorCommands = {
  insertPageBreak: () => boolean;
};

export type SchemaExtension = {
  nodes?: Record<string, unknown>;
  marks?: Record<string, unknown>;
};

export type PremirrorRuntime = {
  plugins: Plugin[];
  keymaps: Plugin[];
  commands: PremirrorCommands;
  schemaExtensions: SchemaExtension[];

  toSnapshot: (state: EditorState) => UnmeasuredDocumentSnapshot;
  measureSnapshot: (
    snapshot: UnmeasuredDocumentSnapshot,
  ) => MeasuredDocumentSnapshot;
  getInvalidationRange: (state: EditorState) => { from: number; to: number } | null;
};

export function createPremirror(options: PremirrorOptions): PremirrorRuntime;
```

M1 schema scope:

- Nodes: `doc`, `paragraph`, `heading`, `blockquote`, `hard_break`, `text`
- Marks: `strong`, `em`, `code`

---

## `@premirror/react`

### Engine hook

```ts
import type { EditorState } from "prosemirror-state";
import type { LayoutInput, LayoutOutput } from "@premirror/core";
import type { PremirrorRuntime } from "@premirror/prosemirror-adapter";

export type UsePremirrorEngineParams = {
  editorState: EditorState;
  runtime: PremirrorRuntime;
  layoutInput: LayoutInput;
  // Optional override for tests/advanced control.
  previousLayoutOverride?: LayoutOutput | null;
};

export type UsePremirrorEngineResult = {
  layout: LayoutOutput;
  diagnostics: ComposeDiagnostics;
};

export function usePremirrorEngine(
  params: UsePremirrorEngineParams,
): UsePremirrorEngineResult;
```

Behavior:

- The hook stores previous layout internally by default.
- Consumers do not need to manually thread `previousLayout` each render.

### Viewport API

```ts
import type { ReactNode } from "react";
import type { LayoutOutput } from "@premirror/core";

export type PremirrorPageViewportProps = {
  layout: LayoutOutput;
  showDebug?: boolean;
  // Expected to contain <ProseMirrorDoc /> for M1 integrations.
  editorLayer: ReactNode;
};

export function PremirrorPageViewport(
  props: PremirrorPageViewportProps,
): JSX.Element;
```

Relationship to ProseMirror DOM:

- `PremirrorPageViewport` is the visual page surface.
- `editorLayer` is the editable PM content layer inside that surface.
- Page chrome and debug overlays are rendered by Premirror outside PM content.

### Selection projection

```ts
import type { EditorState } from "prosemirror-state";
import type { LayoutOutput, ProjectedSelection } from "@premirror/core";

export function useProjectedSelection(
  editorState: EditorState,
  layout: LayoutOutput,
): ProjectedSelection[];
```

---

## Integration Example (React + `react-prosemirror`)

```tsx
import { useMemo, useState } from "react";
import { ProseMirror, ProseMirrorDoc, reactKeys } from "@handlewithcare/react-prosemirror";
import { createPremirror } from "@premirror/prosemirror-adapter";
import { usePremirrorEngine, PremirrorPageViewport } from "@premirror/react";

function PremirrorEditor({ initialState, layoutInput, options }) {
  const [state, setState] = useState(initialState);
  const runtime = useMemo(() => createPremirror(options), [options]);
  const { layout, diagnostics } = usePremirrorEngine({
    editorState: state,
    runtime,
    layoutInput,
  });

  return (
    <ProseMirror
      state={state}
      plugins={[reactKeys(), ...runtime.plugins, ...runtime.keymaps]}
      dispatchTransaction={(tr) => setState((prev) => prev.apply(tr))}
    >
      <PremirrorPageViewport
        layout={layout}
        showDebug
        editorLayer={<ProseMirrorDoc />}
      />
      {/* diagnostics can be rendered in a side panel */}
      <output hidden>{JSON.stringify(diagnostics.warnings)}</output>
    </ProseMirror>
  );
}
```

---

## Reference Pattern Sources

The following Pretext demo files are explicit design references for composer
behavior:

- `pretext/pages/demos/rich-note.ts` (styled run packing + atomic inline items)
- `pretext/pages/demos/dynamic-layout.ts` (cursor handoff across regions)
- `pretext/pages/demos/editorial-engine.ts` (slot-based layout behavior modes)
- `pretext/pages/demos/wrap-geometry.ts` (obstacle interval carving primitives)

These references inform algorithm shape, not strict API compatibility.

---

## Versioning and Freeze

Before `v1.0.0`:

- Minor versions may include API changes with migration notes.

Milestone 1 freeze targets:

1. `PremirrorOptions`
2. `UnmeasuredDocumentSnapshot` / `MeasuredDocumentSnapshot`
3. `LayoutInput` / `LayoutOutput`
4. `createPremirror`
5. `composeLayout`
6. `usePremirrorEngine`
7. `PremirrorPageViewport`

## Remaining Open Questions

1. Should `composeLayout` accept explicit invalidation plans in M1?
2. How much of `MappingIndex` should be public vs internal?
3. Should `@premirror/react` expose lower-level rendering primitives in M1?
