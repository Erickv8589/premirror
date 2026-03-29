import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

const paragraphSpec = basicSchema.spec.nodes.get("paragraph")!;

/** CommonMark-ish schema with list nodes and Premirror pagination attrs on paragraphs. */
export const demoSchema = new Schema({
  nodes: addListNodes(
    basicSchema.spec.nodes.update("paragraph", {
      ...paragraphSpec,
      attrs: {
        manualPageBreakBefore: { default: false },
      },
    }),
    "paragraph block*",
    "block",
  ),
  marks: basicSchema.spec.marks,
});
