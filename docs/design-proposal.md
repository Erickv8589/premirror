# Premirror Design Proposal

## Status

Draft v0.3 - incorporates design review clarifications.

## Vision

Premirror is a library for building Word-class page-layout editors on the web.
It is not a single opinionated editor product. The library should enable teams
to compose their own editing experiences while reusing a shared layout engine,
pagination model, and ProseMirror integration layer.

The first milestone is accurate paper-style pagination. Future milestones add
columns, floating boxes, advanced block layout, and publishing features.

## Product Goals

1. Deterministic pagination for paper-sized pages (A4, Letter, custom).
2. High-fidelity layout behavior for rich text and complex mixed content.
3. Stable and responsive editing while layout reflows in near real time.
4. Library-first architecture with strong extension points and testability.
5. Demo application that proves capabilities and serves as a reference
   integration.

## Non-goals (for early phases)

1. Full parity with every Microsoft Word feature in v1.
2. Hard dependency on a specific app shell, state manager, or design system.
3. Locking users into one schema, one toolbar, or one UI paradigm.

## Design Principles

1. ProseMirror remains the document and transaction source of truth.
2. Layout is a separate deterministic model derived from document snapshots.
3. Render and layout concerns are separated to preserve debuggability.
4. Incremental recomposition is required for performance at scale.
5. API stability is a product feature; internals may evolve.

## Monorepo Structure (Bun)

The repository is a Bun monorepo with app and package workspaces:

- `apps/demo`
  - Reference app for interactive validation and feature demos.
- `packages/core`
  - Public contracts, common types, and shared options.
- `packages/composer`
  - Pagination and layout composition engine.
- `packages/prosemirror-adapter`
  - ProseMirror plugin integration and document/mapping adapters.
- `packages/react`
  - React integration primitives for paged rendering and overlays.

This structure keeps the library independently consumable while allowing the
demo app to stay in-repo and track the same evolving APIs.

## External Dependencies and Role

- `prosemirror-*`: document model, transactions, commands, plugin state.
- `@handlewithcare/react-prosemirror`: React-based rendering/integration layer.
- `@chenglou/pretext`: line measurement and line-break primitives.

## Why `react-prosemirror` (initially without a fork)

The library already provides a safe React rendering bridge and ProseMirror
event lifecycle integration. It gives us enough extension points to build page
composition on top (plugins, decorations, node/mark view components, effect
hooks) without immediately maintaining a heavy fork.

Forking remains an explicit fallback if hard requirements force low-level
changes to root mounting, selection mapping internals, or input/composition
behavior.

## Rendering Architecture (Milestone 1 Decision)

Milestone 1 adopts a single `EditorView` / single `contenteditable` root model
with composer-driven visual pagination.

Chosen approach:

1. ProseMirror remains the editable DOM source (`react-prosemirror` root).
2. Premirror composer computes page/line/fragment layout from extracted snapshot
   data (layout authority).
3. React page UI renders composed pages from `LayoutOutput` in the same scroll
   context, with page chrome and break diagnostics.
4. For Milestone 1, paragraphs split in the layout model as `BlockFragment`
   records; the source PM paragraph node remains a single logical node.

Cursor and selection behavior in M1:

- Native PM/contenteditable behavior remains the interaction source of truth.
- Composer output updates on edit and drives visual page boundaries.
- Position mapping resolves PM position <-> composed fragment/line location for
  overlays and diagnostics.

M1 user-visible model:

- Continuous editable flow with page-separated visual presentation driven by the
  composed layout model.
- True multi-root page edit surfaces are explicitly deferred.

## Ownership Contract

Premirror implementation follows a strict ownership boundary:

1. ProseMirror (`react-prosemirror`) owns:
   - Document state and transactions
   - Native editing interactions (typing, IME, clipboard, core selection state)
2. Premirror composer owns:
   - Line/page/fragment computation
   - Break policy decisions
   - Deterministic layout output and metrics
3. Premirror renderer owns:
   - Visual positioning of fragment nodes from `LayoutOutput`
   - Page chrome, boundaries, guides, and debug overlays outside PM content
4. Mapping layer owns:
   - PM position <-> fragment/line geometry translation
   - Selection/caret projection across split fragments

Design implication:

- We do not "teleport" PM document ownership.
- We do render fragments at computed positions and can render page UI
  independently outside PM content.

## Library Architecture

Premirror is organized into four library packages:

1. `@premirror/core`
   - Public types, configuration model, shared utilities.
   - Versioned API surface and feature flags.

2. `@premirror/prosemirror-adapter`
   - ProseMirror plugin bundle and schema helpers.
   - Document extraction to layout-ready blocks/runs.
   - Position mapping contracts (PM position <-> layout position).

3. `@premirror/composer`
   - Pagination and composition engine.
   - Page/frame model, break decisions, widow/orphan handling.
   - Incremental invalidation and recomposition planner.
   - Uses Pretext for line metrics and per-line fitting.

4. `@premirror/react`
   - React-facing components/hooks for page viewport and overlays.
   - Integration helpers for `react-prosemirror`.
   - Debug UI hooks (layout timing, break reasons, invalidation traces).

Separate app workspace:

- `apps/demo`
  - Reference implementation showcasing core and advanced features.
  - Not required by library consumers.

## Core Data Models (Draft Interfaces)

```ts
type UnmeasuredDocumentSnapshot = {
  blocks: BlockSnapshot[];
};

type BlockSnapshot = {
  id: string;
  // M1 flattens list items into paragraph-like blocks with attrs metadata.
  type: "paragraph" | "heading" | "blockquote";
  attrs: Record<string, unknown>;
  runs: StyledRun[];
  pmRange: { from: number; to: number };
};

type ResolvedMarkSet = {
  strong?: boolean;
  em?: boolean;
  code?: boolean;
  linkHref?: string;
};

type StyledRun = {
  id: string;
  text: string;
  marks: ResolvedMarkSet;
  font: string;
  pmRange: { from: number; to: number };
  atomic?: boolean;
};

type MeasuredRun = {
  runId: string;
  prepared: unknown; // Pretext prepared handle, concrete type in implementation
};

type MeasuredDocumentSnapshot = UnmeasuredDocumentSnapshot & {
  measuredRuns: Record<string, MeasuredRun>;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type LayoutInput = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies: LayoutPolicyConfig;
};

type LayoutOutput = {
  pages: PageLayout[];
  mapping: MappingIndex;
  metrics: ComposeMetrics;
};

type PageLayout = {
  index: number;
  spec: PageSpec;
  frames: FrameLayout[];
};

type FrameLayout = {
  bounds: Rect;
  fragments: BlockFragment[];
};

type BlockFragment = {
  blockId: string;
  fragmentIndex: number;
  pmRange: { from: number; to: number };
  lines: LineBox[];
  breakReason?: BreakReason;
};

type LineBox = {
  y: number;
  height: number;
  runs: PlacedRun[];
  pmRange: { from: number; to: number };
};

type PlacedRun = {
  runId: string;
  x: number;
  width: number;
  text: string;
  font: string;
  marks: ResolvedMarkSet;
  pmRange: { from: number; to: number };
};

type LayoutPoint = {
  pageIndex: number;
  frameIndex: number;
  fragmentIndex: number;
  lineIndex: number;
  offsetInLine: number;
};

type MappingIndex = {
  pmPosToLayout: (pmPos: number) => LayoutPoint | null;
  layoutToPmPos: (point: LayoutPoint) => number | null;
};

type ComposeMetrics = {
  extractionMs: number;
  measurementMs: number;
  composeMs: number;
  pages: number;
  blocks: number;
};
```

Implementation note:

- `UnmeasuredDocumentSnapshot` is a flat block list for M1, not a nested layout
  tree.
- Measured run handles are attached before `composeLayout` to keep composition
  deterministic and avoid measurement side effects in the hot path.

## Pagination and Composition Engine (Starting Scope)

Phase 1 scope is accurate page layout with pagination:

1. Paper geometry and margins.
2. Block flow across page boundaries.
3. Paragraph line composition with Pretext.
4. Explicit/manual page breaks.
5. Keep-with-next and basic widow/orphan policy.
6. Deterministic page-break decisions with inspectable reasons.
7. Explicit mark support for styled runs: `strong`, `em`, `code` in M1.

Out of scope for phase 1:

- Multi-column sections, floating boxes, tables, footnotes/endnotes.

## Pretext Composition Pipeline (Milestone 1)

Premirror uses Pretext as a measurement and line-break primitive, not as a
complete rich-text compositor.

Pipeline:

1. Extract paragraph runs from ProseMirror (`prosemirror-adapter`).
2. Resolve typography per run (including mark-driven font changes).
3. Measure runs upstream (`prepare()`), producing run-attached measured handles.
4. Compose lines with a styled-run packer using `layoutNextLine()` cursors.
5. Compose lines into page frames applying page-break policies.

Reference pattern:

- `pretext/pages/demos/rich-note.ts` is the starting conceptual pattern for
  multi-run composition and cursor-resume behavior.

M1 line packer responsibilities:

- Handle mixed-font runs in one paragraph.
- Treat atomic inline items as indivisible runs.
- Resolve whitespace behavior at run boundaries.
- Preserve deterministic cursor progression for split runs across lines/pages.

## Pretext Demo-Derived Patterns

The demos under `pretext/pages/demos` provide practical layout patterns that
Premirror should treat as reference inputs:

1. Styled run packing:
   - `rich-note.ts` demonstrates cursor-resume behavior across mixed runs and
     atomic inline items.
2. Region handoff flow:
   - `dynamic-layout.ts` shows cursor handoff between independent regions (a
     useful mental model for frame/page continuation).
3. Obstacle-driven wrapping:
   - `wrap-geometry.ts` + `editorial-engine.ts` reduce complex shapes to blocked
     horizontal intervals per line band (`carveTextLineSlots` pattern).
4. Slot policy variants:
   - single-slot flow and multi-slot fill are distinct behaviors and should be
     explicit composer policies, not accidental implementation differences.
5. Performance patterns:
   - prepared-run caching, `requestAnimationFrame` batching, and
     `document.fonts.ready` synchronization are baseline operational patterns.

## Future Layout Capabilities

Planned evolution after pagination baseline:

1. Multi-column sections per page/frame.
2. Floating boxes (text/image) with exclusion geometry.
3. Anchored objects and wrap modes.
4. Headers/footers and section-level page settings.
5. Tables with stable editing semantics.
6. Footnotes/endnotes and constrained area allocation.

## Public API Direction (Draft)

```ts
type PremirrorOptions = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies?: LayoutPolicyConfig;
  features?: Record<string, boolean>;
};

type PremirrorRuntime = {
  plugins: Plugin[];
  keymaps: Plugin[];
  commands: PremirrorCommands;
  schemaExtensions: SchemaExtension[];
  toSnapshot: (state: EditorState) => UnmeasuredDocumentSnapshot;
  measureSnapshot: (
    snapshot: UnmeasuredDocumentSnapshot,
  ) => MeasuredDocumentSnapshot;
};

function createPremirror(options: PremirrorOptions): PremirrorRuntime;

function composeLayout(
  snapshot: MeasuredDocumentSnapshot,
  previous: LayoutOutput | null,
  input: LayoutInput,
): LayoutOutput;
```

Canonical API details live in `docs/proposed-api-design.md`. If there is any
conflict between this section and that document, the API design document wins.

Measurement ownership decision:

- Measurement is upstream of `composeLayout` (adapter/measurement service).
- `composeLayout` consumes pre-measured run handles and remains deterministic in
  behavior given stable inputs.
- This separation keeps the composition hot path testable without canvas calls.

Schema extension note:

- `schemaExtensions` is used in M1 for pagination-specific semantics (for
  example, explicit page-break representation) while preserving baseline PM
  compatibility.

## `react-prosemirror` Integration Boundary

Planned extension points in M1:

1. `ProseMirror` / `ProseMirrorDoc` as editor shell.
2. `reactKeys()` plugin for stable node identity.
3. `useEditorEffect` for post-update layout trigger hooks.
4. `useEditorEventCallback` / `useEditorEventListener` for editor-bound actions.
5. `nodeViewComponents` for block-level rendering controls.
6. `widget()` decorations for page chrome, break markers, and diagnostics.

Fork triggers (explicit):

1. Need multiple editable roots (one per page) under a single document state.
2. Need to override root DOM structure between PM output and render tree.
3. Need low-level selection/caret painting behavior not achievable via public
   APIs.

## Performance Strategy

1. Incremental recomposition by invalidation regions, not full-doc recompute.
2. Cache prepared text runs and style metrics keyed by typography signature.
3. Separate urgent editing updates from non-urgent full reflow passes.
4. Maintain profiling counters per transaction (compose time, invalidated nodes).
5. Ship stress fixtures early (long docs, mixed scripts, many pages).

Milestone 1 interactivity goal:

- Visible-page recomposition should complete in the same interaction frame for
  common typing edits when possible.
- A non-blocking follow-up pass may refine non-visible regions.

Medium document definition (for M1 targets):

- ~50 pages, ~500 paragraphs, mixed headings/body, with `strong`/`em`/`code`
  marks and representative inline hard breaks.

## Correctness Strategy

1. Determinism tests: same input produces same page breaks and mappings.
2. Mapping round-trip tests: PM position <-> layout location invariants.
3. Snapshot tests for page break reasons and block placements.
4. Browser regression checks for composition-sensitive interactions.
5. Manual quality gates in demo app for cursor/selection/IME behavior.

## Demo App Requirements

The demo app exists to validate and communicate library capability. It should:

1. Show realistic paged editing on A4/Letter docs.
2. Expose a debug panel for layout timings and break decisions.
3. Include stress examples (long technical doc, mixed RTL/CJK content).
4. Showcase advanced examples as features land (columns, floats, tables).
5. Remain thin enough that consumers can copy integration patterns.
6. Render verification in M1 uses structural assertions on the rendered page
   tree plus layout snapshot checks (visual regression deferred).

## Delivery Plan

### Milestone 1 - Accurate Pagination Foundation

Scope summary:

1. Bun monorepo and workspace packages scaffolded.
2. Page model and composition pipeline implemented.
3. Paragraph + block flow pagination with deterministic output.
4. Basic policy controls: manual break, keep-with-next, widows/orphans v1.
5. Demo page showing live editing with stable page breaks.

Detailed implementation plan:

- See `docs/milestone-1-implementation-plan.md`.

### Milestone 2 - Editing Robustness and Performance

- Strong mapping layer for selection/caret behavior.
- Incremental invalidation and recomposition.
- Performance instrumentation and baseline targets.
- Expanded fixture coverage.

### Milestone 3 - Advanced Layout Primitives

- Multi-column flow.
- Floating boxes with exclusion paths.
- Anchored object positioning.

### Milestone 4 - Publishing-grade Features

- Tables v1, headers/footers, section controls.
- Footnotes/endnotes.
- Print/export parity and regression harness.

## Open Questions

1. Should multi-column be section-level only, or page-region level?
2. Which minimum table capability is required before calling v1 "usable"?
3. How strict should widow/orphan defaults be vs app-configurable policies?
4. Do we provide a first-party PDF/export package, or defer to integrators?

## Risks and Mitigations

1. High complexity in selection/caret mapping across reflow.
   - Mitigation: define mapping invariants early and test continuously.
2. Performance regressions on long documents.
   - Mitigation: incremental invalidation and profiling built from day one.
3. Upstream churn in `react-prosemirror`.
   - Mitigation: adapter boundary and optional fork path kept explicit.
4. Scope creep from "Word parity" ambition.
   - Mitigation: milestone gates and strict per-feature acceptance criteria.

## Immediate Next Steps

1. Finalize Milestone 1 contract types in `@premirror/core`.
2. Land snapshot extraction + mapping round-trip scaffolding.
3. Implement first deterministic compose pipeline with page/frame output.
4. Wire policies v1 and expose break-reason diagnostics.
5. Integrate into demo and lock fixture snapshots plus baseline metrics.
