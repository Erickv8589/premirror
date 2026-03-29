import { describe, expect, it } from "bun:test";

import type {
  LayoutInput,
  MeasuredDocumentSnapshot,
  PremirrorOptions,
} from "@premirror/core";
import {
  createLayoutInputFromOptions,
  defaultPremirrorOptions,
} from "@premirror/core";

import { composeLayout } from "./index";

function makeInput(overrides?: Partial<PremirrorOptions>): LayoutInput {
  return createLayoutInputFromOptions(defaultPremirrorOptions(overrides));
}

function makeSnapshot(text: string): MeasuredDocumentSnapshot {
  return {
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        attrs: {},
        pmRange: { from: 1, to: text.length + 2 },
        runs: [
          {
            id: "r1",
            text,
            font: "normal 400 16px Inter",
            marks: {},
            pmRange: { from: 1, to: text.length + 1 },
          },
        ],
      },
    ],
    measuredRuns: {
      r1: {
        runId: "r1",
        prepared: {},
        widthPx: Math.max(20, text.length * 8),
        textLength: text.length,
      },
    },
  };
}

describe("@premirror/composer", () => {
  it("produces at least one page and frame", () => {
    const out = composeLayout(makeSnapshot("Hello Premirror"), null, makeInput());
    expect(out.pages.length).toBeGreaterThan(0);
    expect(out.pages[0]?.frames.length).toBe(1);
  });

  it("is deterministic for page+fragment structure", () => {
    const snapshot = makeSnapshot("Determinism test paragraph that wraps.");
    const input = makeInput();
    const a = composeLayout(snapshot, null, input);
    const b = composeLayout(snapshot, null, input);
    expect(JSON.stringify(a.pages)).toBe(JSON.stringify(b.pages));
  });

  it("applies manual page break before a block", () => {
    const snapshot: MeasuredDocumentSnapshot = {
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          attrs: {},
          pmRange: { from: 1, to: 20 },
          runs: [
            {
              id: "r1",
              text: "First block.",
              font: "normal 400 16px Inter",
              marks: {},
              pmRange: { from: 1, to: 12 },
            },
          ],
        },
        {
          id: "b2",
          type: "paragraph",
          attrs: { manualPageBreakBefore: true },
          pmRange: { from: 21, to: 40 },
          runs: [
            {
              id: "r2",
              text: "Second block.",
              font: "normal 400 16px Inter",
              marks: {},
              pmRange: { from: 21, to: 33 },
            },
          ],
        },
      ],
      measuredRuns: {
        r1: { runId: "r1", prepared: {}, widthPx: 80, textLength: 12 },
        r2: { runId: "r2", prepared: {}, widthPx: 90, textLength: 13 },
      },
    };
    const out = composeLayout(snapshot, null, makeInput());
    expect(out.pages.length).toBeGreaterThanOrEqual(2);
  });

  it("round-trips mapping positions for a line", () => {
    const out = composeLayout(makeSnapshot("Mapping"), null, makeInput());
    const point = out.mapping.pmPosToLayout(2);
    expect(point).not.toBeNull();
    if (!point) return;
    const back = out.mapping.layoutToPmPos(point);
    expect(back).toBe(2);
  });
});
