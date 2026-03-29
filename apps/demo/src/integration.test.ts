import { describe, expect, it } from "bun:test";

import {
  createLayoutInputFromOptions,
  defaultPremirrorOptions,
} from "@premirror/core";
import { createPremirror } from "@premirror/prosemirror-adapter";
import { EditorState } from "prosemirror-state";

import { demoSchema } from "./schema";

describe("demo integration", () => {
  it("runs snapshot -> measure -> compose end-to-end", async () => {
    const options = defaultPremirrorOptions();
    const runtime = createPremirror(options);
    const compose = await import("@premirror/composer");

    const state = EditorState.create({
      schema: demoSchema,
      doc: demoSchema.node("doc", null, [
        demoSchema.node("paragraph", null, [
          demoSchema.text("Hello world from integration test."),
        ]),
      ]),
      plugins: runtime.plugins,
    });

    const snapshot = runtime.toSnapshot(state);
    const measured = runtime.measureSnapshot(snapshot);
    const layout = compose.composeLayout(
      measured,
      null,
      createLayoutInputFromOptions(options),
    );

    expect(layout.pages.length).toBeGreaterThan(0);
    expect(layout.metrics.blocks).toBeGreaterThan(0);
  });
});
