# Premirror Proposed API Design

## Status

Draft v0.1 (targeting Milestone 1 implementation).

## Purpose

Define the initial public API surface for Premirror as a library. This document
is a contract proposal for package boundaries and integration flow, not final
runtime behavior.

## Design Goals

1. Keep APIs small and composable for library consumers.
2. Preserve strict ownership boundaries:
   - ProseMirror owns document and transactions.
   - Composer owns line/page/fragment layout.
   - Renderer owns visual positioning.
3. Make deterministic composition easy to test.
4. Support incremental evolution from Milestone 1 to advanced features.

## Package Surface Overview

- `@premirror/core`
  - Shared public types and configuration schema.
- `@premirror/composer`
  - Layout engine APIs (`composeLayout`, policies, metrics).
- `@premirror/prosemirror-adapter`
  - Snapshot extraction, measurement prep, mapping bridges, plugin bundle.
- `@premirror/react`
  - React integration hooks/components for page rendering and diagnostics.

---

## `@premirror/core`

### Key types

```ts
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
};
```

### Snapshot and layout contracts

```ts
export type DocumentSnapshot = {
  blocks: BlockSnapshot[];
  measuredRuns: Record<string, MeasuredRun>;
};

export type BlockSnapshot = {
  id: string;
  type: "paragraph" | "heading" | "blockquote" | "list_item";
  attrs: Record<string, unknown>;
  runs: StyledRun[];
  pmRange: { from: number; to: number };
};

export type StyledRun = {
  id: string;
  text: string;
  font: string;
  marks: ResolvedMarkSet;
  pmRange: { from: number; to: number };
  atomic?: boolean;
};

export type MeasuredRun = {
  runId: string;
  prepared: unknown;
};

export type LayoutInput = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies: LayoutPolicyConfig;
};

export type LayoutOutput = {
  pages: PageLayout[];
  mapping: MappingIndex;
  metrics: ComposeMetrics;
};
```

### Setup options

```ts
export type PremirrorOptions = {
  page: PageSpec;
  margins: PageMargins;
  typography: TypographyConfig;
  policies?: LayoutPolicyConfig;
};
```

---

## `@premirror/composer`

### Primary API

```ts
import type { DocumentSnapshot, LayoutInput, LayoutOutput } from "@premirror/core";

export function composeLayout(
  snapshot: DocumentSnapshot,
  previous: LayoutOutput | null,
  input: LayoutInput,
): LayoutOutput;
```

### Policy API

```ts
export type BreakReason =
  | "frame_overflow"
  | "manual_page_break"
  | "keep_with_next"
  | "widow_orphan_protection";

export type PolicyDecision = {
  accepted: boolean;
  reason?: BreakReason;
};

export function evaluateBreakPolicies(/* internal layout state */): PolicyDecision;
```

### Composer constraints (M1)

1. `composeLayout` is deterministic given stable `snapshot` + `input`.
2. Measurement is upstream (`snapshot.measuredRuns` already populated).
3. Supported marks in M1: `strong`, `em`, `code`.

---

## `@premirror/prosemirror-adapter`

### Adapter creation

```ts
import type { Plugin } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import type { DocumentSnapshot, PremirrorOptions } from "@premirror/core";

export type PremirrorAdapter = {
  plugins: Plugin[];
  toSnapshot: (state: EditorState) => DocumentSnapshot;
  measureSnapshot: (snapshot: DocumentSnapshot) => DocumentSnapshot;
  getInvalidationRange: (state: EditorState) => { from: number; to: number } | null;
};

export function createProsemirrorAdapter(options: PremirrorOptions): PremirrorAdapter;
```

### Plugin bundle

```ts
export type PremirrorPluginBundle = {
  plugins: Plugin[];
  keymaps: Plugin[];
  commands: PremirrorCommands;
  schemaExtensions: SchemaExtension[];
};
```

### M1 schema scope

Nodes:
- `doc`, `paragraph`, `heading`, `blockquote`, `hard_break`, `text`

Marks:
- `strong`, `em`, `code`

---

## `@premirror/react`

### Engine wiring hook

```ts
import type { EditorState } from "prosemirror-state";
import type { LayoutInput, LayoutOutput } from "@premirror/core";
import type { PremirrorAdapter } from "@premirror/prosemirror-adapter";

export type UsePremirrorEngineParams = {
  editorState: EditorState;
  adapter: PremirrorAdapter;
  layoutInput: LayoutInput;
  previousLayout: LayoutOutput | null;
};

export type UsePremirrorEngineResult = {
  layout: LayoutOutput;
  diagnostics: ComposeDiagnostics;
};

export function usePremirrorEngine(
  params: UsePremirrorEngineParams,
): UsePremirrorEngineResult;
```

### Rendering components

```ts
import type { LayoutOutput } from "@premirror/core";

export type PremirrorPageViewportProps = {
  layout: LayoutOutput;
  showDebug?: boolean;
};

export function PremirrorPageViewport(
  props: PremirrorPageViewportProps,
): JSX.Element;
```

### Selection projection hooks

```ts
import type { EditorState } from "prosemirror-state";
import type { LayoutOutput } from "@premirror/core";

export function useProjectedSelection(
  editorState: EditorState,
  layout: LayoutOutput,
): ProjectedSelection[];
```

---

## End-to-End Usage (M1)

```ts
import { createProsemirrorAdapter } from "@premirror/prosemirror-adapter";
import { composeLayout } from "@premirror/composer";
import { PremirrorPageViewport } from "@premirror/react";

const adapter = createProsemirrorAdapter(options);

function runLayout(editorState, previousLayout, layoutInput) {
  const snapshot = adapter.toSnapshot(editorState);
  const measured = adapter.measureSnapshot(snapshot);
  return composeLayout(measured, previousLayout, layoutInput);
}
```

---

## Error Model (Proposed)

1. Programmer errors (invalid options/types) throw synchronously.
2. Recoverable composition issues return diagnostics with fallback behavior.
3. Mapping misses return explicit result objects, not thrown exceptions.

```ts
export type ComposeDiagnostics = {
  warnings: string[];
  timings: ComposeMetrics;
};
```

## Versioning Policy (Proposed)

Before `v1.0.0`:

- Minor versions may include API changes when needed.
- Breaking changes require migration notes in `docs/`.

After `v1.0.0`:

- Semver with deprecation windows for non-trivial API changes.

## Milestone 1 API Freeze List

These APIs should be considered stable by end of M1:

1. `PremirrorOptions`
2. `DocumentSnapshot`
3. `LayoutInput`
4. `LayoutOutput`
5. `composeLayout`
6. `createProsemirrorAdapter`
7. `usePremirrorEngine`
8. `PremirrorPageViewport`

## Open API Questions

1. Should `measureSnapshot` be public, or hidden behind `toSnapshot`?
2. Should `composeLayout` accept explicit invalidation plans in M1?
3. How much mapping API should be public vs internal?
4. Should `@premirror/react` expose low-level primitives or only high-level
   viewport components?
