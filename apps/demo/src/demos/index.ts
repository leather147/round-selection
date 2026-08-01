import { AdjacentDemo } from "./AdjacentDemo";
import { BidiDemo } from "./BidiDemo";
import { ChatDemo } from "./ChatDemo";
import { ContourDemo } from "./ContourDemo";
import { DenseDemo } from "./DenseDemo";
import { FragmentDemo } from "./FragmentDemo";
import type { DemoProject } from "./types";

export const demoProjects: DemoProject[] = [
  {
    id: "fragments",
    index: "01",
    title: "Measured fragments",
    label: "fragment-fill",
    summary: "A strict rendering of every browser rectangle with no inferred continuity.",
    bestFor: "Debug views, geometry inspection and the cheapest possible custom surface.",
    component: FragmentDemo,
  },
  {
    id: "contour",
    index: "02",
    title: "Editorial contour",
    label: "contour-union",
    summary: "A continuous multiline silhouette traced and rounded as one SVG path.",
    bestFor: "Articles, reading interfaces, chat, mixed widths and complex backgrounds.",
    component: ContourDemo,
  },
  {
    id: "corners",
    index: "03",
    title: "Documentation corners",
    label: "adjacent-corners",
    summary: "DOM rectangles with neighbour-aware outer and inverse corner treatment.",
    bestFor: "Flat documentation surfaces where CSS layers are preferred over SVG.",
    component: AdjacentDemo,
  },
  {
    id: "chat",
    index: "04",
    title: "Conversation surface",
    label: "application",
    summary: "Multiple independent selection roots inside compact message bubbles.",
    bestFor: "Messengers, comments and collaborative interfaces.",
    component: ChatDemo,
  },
  {
    id: "bidi",
    index: "05",
    title: "Mixed direction",
    label: "edge case",
    summary: "LTR, Arabic and Hebrew fragments measured in a single document flow.",
    bestFor: "International products and bidirectional editorial content.",
    component: BidiDemo,
  },
  {
    id: "dense",
    index: "06",
    title: "Dense records",
    label: "stress surface",
    summary: "A compact data view for selecting through many aligned text fragments.",
    bestFor: "Tables, logs and dense operational dashboards.",
    component: DenseDemo,
  },
];
