import { composeLayout } from "../src/index";
import {
  createLayoutInputFromOptions,
  defaultPremirrorOptions,
  type MeasuredDocumentSnapshot,
} from "@premirror/core";

function nowMs(): number {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return perf && typeof perf.now === "function" ? perf.now() : Date.now();
}

const paragraph =
  "Premirror benchmark paragraph with enough length to wrap across multiple lines. ";

const blocks = Array.from({ length: 500 }, (_, i) => {
  const text = `${i + 1}. ${paragraph.repeat(3)}`;
  const from = i * 1000 + 1;
  const to = from + text.length + 1;
  const runId = `run-${i}`;
  return {
    id: `block-${i}`,
    type: "paragraph" as const,
    attrs: {},
    pmRange: { from, to },
    runs: [
      {
        id: runId,
        text,
        font: "normal 400 16px Inter",
        marks: {},
        pmRange: { from, to: to - 1 },
      },
    ],
  };
});

const measuredRuns = Object.fromEntries(
  blocks.map((b) => {
    const run = b.runs[0]!;
    return [
      run.id,
      {
        runId: run.id,
        prepared: {},
        widthPx: run.text.length * 7.4,
        textLength: run.text.length,
      },
    ];
  }),
);

const snapshot: MeasuredDocumentSnapshot = {
  blocks,
  measuredRuns,
};

const input = createLayoutInputFromOptions(defaultPremirrorOptions());

const iterations = 20;
const durations: number[] = [];

for (let i = 0; i < iterations; i++) {
  const t0 = nowMs();
  composeLayout(snapshot, null, input);
  durations.push(nowMs() - t0);
}

const sorted = [...durations].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

console.log("Premirror compose benchmark");
console.log(`iterations: ${iterations}`);
console.log(`medianMs: ${median.toFixed(2)}`);
console.log(`p95Ms: ${p95.toFixed(2)}`);
