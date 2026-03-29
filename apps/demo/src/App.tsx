import { Toolbar } from "@base-ui-components/react/toolbar";
import { Switch } from "@base-ui-components/react/switch";
import {
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
} from "@handlewithcare/react-prosemirror";
import {
  createLayoutInputFromOptions,
  defaultPremirrorOptions,
  type LayoutOutput,
} from "@premirror/core";
import { createPremirror } from "@premirror/prosemirror-adapter";
import {
  PremirrorPageViewport,
  usePremirrorEngine,
  useProjectedSelection,
} from "@premirror/react";
import { keymap } from "prosemirror-keymap";
import { type Node as ProseMirrorNode } from "prosemirror-model";
import { EditorState, type Transaction } from "prosemirror-state";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { Decoration, DecorationSet } from "prosemirror-view";
import { useCallback, useMemo, useState } from "react";

import { demoSchema } from "./schema";

function buildInitialState(
  runtime: ReturnType<typeof createPremirror>,
): EditorState {
  const strong = demoSchema.marks.strong;
  const em = demoSchema.marks.em;
  const code = demoSchema.marks.code;
  if (!strong || !em || !code) {
    throw new Error("demoSchema missing basic marks");
  }

  const fixtureParagraphs = [
    "Premirror Milestone 1 test document. This paragraph is intentionally long so we can validate word wrapping inside the composed frame. The quick brown fox jumps over the lazy dog while pagination logic tracks run boundaries and maps document ranges to absolute fragment positions.",
    "Second paragraph for wrapping and flow. We expect lines to break naturally at word boundaries and continue on subsequent lines before moving to the next page frame. This should mimic a word-processor style reading flow rather than a single scroll box.",
    "Third paragraph adds more content pressure. Layout metrics should increase pages when required, and each line fragment should remain fully inside the page content rect with no orphan leading character rendered outside its decorated run.",
    "Fourth paragraph repeats structured prose to force pagination. Typography and measured widths from pretext should drive deterministic line breaks. Selection and caret mapping should still align with these visual fragments.",
    "Fifth paragraph: the architecture keeps ProseMirror as source of truth while decorations project fragments into absolute page coordinates. This gives us editable rich text with page-aware rendering behavior.",
    "Sixth paragraph closes the synthetic test fixture. If everything works, we should see multiple pages and no inner frame scrolling. Wrapping should remain stable across refreshes.",
  ];
  const repeated = Array.from({ length: 7 }, (_, i) =>
    fixtureParagraphs.map((text) => `${text} Section ${i + 1}.`),
  ).flat();
  const doc = demoSchema.node(
    "doc",
    null,
    repeated.map((text) => demoSchema.node("paragraph", null, [demoSchema.text(text)])),
  );

  return EditorState.create({
    doc,
    schema: demoSchema,
    plugins: [
      reactKeys(),
      history(),
      ...runtime.plugins,
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Shift-Mod-z": redo,
        "Mod-b": toggleMark(strong),
        "Mod-i": toggleMark(em),
        "Mod-`": toggleMark(code),
      }),
      keymap(baseKeymap),
      ...runtime.keymaps,
    ],
  });
}

function styleForRunPosition(
  left: number,
  top: number,
  _width: number,
  lineHeight: number,
): string {
  return [
    "position:absolute",
    `left:${left}px`,
    `top:${top}px`,
    `height:${lineHeight}px`,
    `line-height:${lineHeight}px`,
    "white-space:pre",
  ].join(";");
}

function buildFragmentDecorations(
  doc: ProseMirrorNode,
  layout: LayoutOutput,
): DecorationSet {
  const decorations: Decoration[] = [];
  let pageTop = 0;
  for (const page of layout.pages) {
    for (const frame of page.frames) {
      for (const fragment of frame.fragments) {
        for (const line of fragment.lines) {
          const lineTop = pageTop + frame.bounds.y + line.y;
          for (const run of line.runs) {
            if (run.pmRange.from >= run.pmRange.to) continue;
            decorations.push(
              Decoration.inline(
                run.pmRange.from,
                run.pmRange.to,
                {
                  class: "premirror-fragment-run",
                  style: styleForRunPosition(
                    frame.bounds.x + run.x,
                    lineTop,
                    run.width,
                    line.height,
                  ),
                },
                {
                  inclusiveStart: false,
                  inclusiveEnd: false,
                },
              ),
            );
          }
        }
      }
    }
    pageTop += page.spec.heightPx + 24;
  }
  return DecorationSet.create(doc, decorations);
}

export function App() {
  const options = useMemo(() => defaultPremirrorOptions(), []);
  const runtime = useMemo(() => createPremirror(options), [options]);
  const layoutInput = useMemo(() => createLayoutInputFromOptions(options), [options]);

  const [editorState, setEditorState] = useState(() => buildInitialState(runtime));
  const [showDebug, setShowDebug] = useState(false);

  const { layout, diagnostics } = usePremirrorEngine({
    editorState,
    runtime,
    layoutInput,
  });

  const projection = useProjectedSelection(editorState, layout);
  const fragmentDecorations = useMemo(
    () => buildFragmentDecorations(editorState.doc, layout),
    [editorState.doc, layout],
  );

  const dispatch = useCallback((tr: Transaction) => {
    setEditorState((s) => s.apply(tr));
  }, []);

  const run = useCallback(
    (fn: (s: EditorState, d?: (tr: Parameters<EditorState["apply"]>[0]) => void) => boolean) => {
      fn(editorState, dispatch);
    },
    [editorState, dispatch],
  );

  const strongMark = demoSchema.marks.strong;
  const emMark = demoSchema.marks.em;
  const codeMark = demoSchema.marks.code;

  const toggleBold = useCallback(() => {
    if (!strongMark) return;
    run((s, d) => toggleMark(strongMark)(s, d));
  }, [run, strongMark]);

  const toggleItalic = useCallback(() => {
    if (!emMark) return;
    run((s, d) => toggleMark(emMark)(s, d));
  }, [run, emMark]);

  const toggleCode = useCallback(() => {
    if (!codeMark) return;
    run((s, d) => toggleMark(codeMark)(s, d));
  }, [run, codeMark]);

  const pageBreak = useCallback(() => {
    run((s, d) => runtime.commands.insertPageBreak(s, d));
  }, [run, runtime.commands]);

  return (
    <div className="word-shell">
      <Toolbar.Root className="word-toolbar">
        <Toolbar.Group className="word-toolbar-group">
          <Toolbar.Button className="word-toolbar-btn" type="button" onClick={toggleBold}>
            Bold
          </Toolbar.Button>
          <Toolbar.Button className="word-toolbar-btn" type="button" onClick={toggleItalic}>
            Italic
          </Toolbar.Button>
          <Toolbar.Button className="word-toolbar-btn" type="button" onClick={toggleCode}>
            Code
          </Toolbar.Button>
          <Toolbar.Separator className="word-toolbar-sep" />
          <Toolbar.Button className="word-toolbar-btn" type="button" onClick={pageBreak}>
            Page break
          </Toolbar.Button>
        </Toolbar.Group>
        <Toolbar.Group className="word-toolbar-group word-toolbar-debug">
          <span className="word-toolbar-label">Debug</span>
          <Switch.Root
            className="word-debug-switch"
            checked={showDebug}
            onCheckedChange={(checked) => {
              setShowDebug(checked);
            }}
          >
            <Switch.Thumb className="word-debug-thumb" />
          </Switch.Root>
        </Toolbar.Group>
      </Toolbar.Root>

      <div className="doc-title-row">
        <div className="doc-title">Untitled document</div>
        <div className="doc-meta">
          pages {layout.pages.length} · compose {diagnostics.timings.composeMs.toFixed(1)}ms · measure{" "}
          {diagnostics.timings.measurementMs.toFixed(1)}ms
        </div>
      </div>

      <div className="paged-viewport-wrap">
        <div className="paged-viewport-inner">
          <div className="premirror-stack">
            <PremirrorPageViewport
              layout={layout}
              showDebug={showDebug}
              editorLayer={
                <ProseMirror
                  state={editorState}
                  dispatchTransaction={dispatch}
                  decorations={() => fragmentDecorations}
                >
                  <ProseMirrorDoc />
                </ProseMirror>
              }
            />
            {showDebug ? (
              <div className="selection-overlay" aria-hidden>
                {projection.rects.map((r, i) => (
                  <div
                    key={i}
                    className="selection-rect"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: r.width,
                      height: r.height,
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
