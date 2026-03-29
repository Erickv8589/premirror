import { describe, expect, it } from "bun:test";
import React from "react";

import type { LayoutOutput } from "@premirror/core";

import { PremirrorPageViewport } from "./index";

describe("@premirror/react", () => {
  it("creates a page viewport element", () => {
    const layout: LayoutOutput = {
      pages: [
        {
          index: 0,
          spec: { widthPx: 800, heightPx: 1000, preset: "letter" },
          frames: [{ bounds: { x: 80, y: 80, width: 640, height: 840 }, fragments: [] }],
        },
      ],
      mapping: {
        pmPosToLayout: () => null,
        layoutToPmPos: () => null,
      },
      metrics: {
        extractionMs: 0,
        measurementMs: 0,
        composeMs: 1,
        pages: 1,
        blocks: 0,
      },
    };

    const element = PremirrorPageViewport({
      layout,
      showDebug: true,
      editorLayer: <div />,
    });

    expect(React.isValidElement(element)).toBe(true);
  });
});
