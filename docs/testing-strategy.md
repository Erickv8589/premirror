# Premirror Testing Strategy

## Status

Draft v0.1 (Milestone 1 test execution plan).

## Purpose

Define how Premirror verifies correctness, determinism, rendering behavior, and
performance during Milestone 1. This document operationalizes the testing
sections in the design and implementation plans.

## Testing Principles

1. Determinism is non-negotiable.
2. Mapping correctness is a first-class invariant.
3. Performance targets are measured, not assumed.
4. Browser-sensitive behavior must be verified in real browsers.
5. Snapshots are tools, not authority; semantic assertions come first.

---

## Test Suite Matrix

### 1) Unit tests

Target packages:

- `@premirror/core`
- `@premirror/prosemirror-adapter`
- `@premirror/composer`
- `@premirror/react` (hook/component behavior where feasible)

Scope:

- Pure type/contract helpers (`core`).
- Snapshot extraction and mapping helper logic (adapter).
- Line packing, page packing, and policy decisions (composer).
- Engine hook state transitions and projection helpers (react).

Required assertions:

- API invariants and contract defaults.
- Policy behavior for edge conditions.
- Mapping primitives return stable, expected results.

### 2) Layout snapshot tests

Primary artifact:

- `LayoutOutput` structural snapshots for fixture docs.

Snapshot scope:

- page count and frame bounds
- fragment boundaries and break reasons
- line box ranges and placed run boundaries

Rules:

- Snapshot tests must be paired with semantic assertions (not snapshot-only).
- Use deterministic fixture inputs (fixed typography/page config).

### 3) Integration tests (editor -> layout -> viewport)

Scope:

- End-to-end flow:
  - ProseMirror edit transaction
  - adapter extraction/measurement
  - compose pass
  - viewport update

Assertions:

- Structural rendered page tree checks.
- Selection projection shape checks.
- No fatal regressions across page boundaries on core interactions.

### 4) Browser interaction tests

Required environments for M1:

- Chromium (primary CI browser)
- WebKit and Firefox (nightly or scheduled lane)

Scope:

- Cursor navigation across page boundaries.
- Selection spanning fragments.
- IME-sensitive input flow sanity checks.
- Clipboard and hard-break behavior in the paged UI.

### 5) Performance tests

Scope:

- Compose pipeline timings (extraction/measurement/composition).
- Recomposition behavior on local edits.

M1 baseline targets:

- Local paragraph edit on medium doc: visible-page recompose < 16ms median.
- Full recomposition on medium doc: < 120ms median.
- No determinism drift across repeated composition runs.

---

## Fixture Strategy

## Fixture tiers

1. `smoke`
   - short docs used for fast local checks.
2. `core`
   - canonical milestone fixtures for PR gates.
3. `stress`
   - long-form docs for perf and robustness.

## Required fixture coverage (M1)

1. Basic paragraphs and headings.
2. Marks: `strong`, `em`, `code`.
3. Hard breaks and mixed inline run widths.
4. Keep-with-next + widow/orphan policy scenarios.
5. Multi-page overflow and repeated reflow cases.
6. Mixed-script sample (LTR/RTL/CJK representative content).
7. Styled-run packer with atomic inline items (rich-note-style fixture).
8. Region handoff continuity (cursor continuation across two frames).
9. Slot carving behavior with blocked intervals (single-slot flow baseline).
10. Optional feature-flag fixture for multi-slot fill behavior.

## Fixture metadata

Each fixture should declare:

- document source (PM JSON or builder)
- page/margin/typography config
- expected high-level outcomes (page count, key break events)

---

## Snapshot Governance

## When snapshot updates are allowed

- Intentional composition rule change.
- Intentional policy behavior change.
- Intentional mapping model change.

## Snapshot update checklist

1. Explain why expected output changed.
2. Confirm determinism pass still holds.
3. Confirm mapping invariants still pass.
4. Confirm no unreviewed perf regression in baseline tests.

## Red flags

- Large snapshot churn from unrelated code changes.
- Snapshot deltas without corresponding semantic assertions.

---

## CI Strategy

### Fast PR lane (required on every PR)

1. Typecheck/lint for all packages.
2. Unit tests.
3. Core layout snapshot tests.
4. Core integration tests (headless browser where needed).

### Extended lane (scheduled and before milestone cut)

1. Cross-browser interaction tests (Chromium, WebKit, Firefox).
2. Stress fixtures.
3. Performance benchmark suite.

### Failure policy

- Fail fast lane => PR blocked.
- Extended lane regression => triage required; may block release branch.

---

## Performance Measurement Protocol

## Run protocol

1. Run each scenario multiple times (minimum 20 iterations).
2. Record median and p95.
3. Separate cold and warm runs.
4. Report extraction/measurement/compose timings separately.

## Benchmark corpus definition (M1 "medium doc")

- ~50 pages
- ~500 paragraphs
- mixed heading/body content
- `strong`/`em`/`code` marks
- representative hard breaks

## Reporting

- Commit benchmark summaries with timestamp and environment notes.
- Track trend over time for key scenarios.

---

## Environment and Stability Contract

Deterministic tests require controlled environment assumptions.

## Font and typography

1. Use pinned named fonts for test baselines.
2. Avoid `system-ui` in baseline fixtures.
3. Keep typography config explicit in fixture metadata.

## Browser/runtime

1. Pin CI browser versions where possible.
2. Record Bun/node/runtime versions for benchmark runs.
3. Note OS/platform for baseline captures.

---

## Mapping Invariant Checklist (M1)

Every relevant suite should assert at least:

1. PM position -> layout point -> PM position round-trip for representative
   positions.
2. Selection ranges crossing page boundaries project into non-overlapping
   ordered rect sets.
3. Fragment boundary mapping does not produce invalid PM positions.

## Demo-Derived Regression Fixtures

Add focused fixtures inspired by Pretext demos:

1. `rich-runs-inline-atoms`:
   - mixed runs + atomic inline item continuation behavior.
2. `two-frame-cursor-handoff`:
   - verifies deterministic continuation from frame A to frame B.
3. `band-interval-carving`:
   - verifies slot carving and min slot width handling.
4. `headline-no-word-break`:
   - verifies line-fit predicate that rejects mid-word headline breaks.

These are structural regression fixtures, not visual parity tests against demo
renderings.

---

## Initial Task List

1. Create fixture directories and metadata schema.
2. Add unit test skeletons per package.
3. Add layout snapshot harness for `LayoutOutput`.
4. Add integration harness for edit -> recompose -> render.
5. Add benchmark runner and baseline reporter.
