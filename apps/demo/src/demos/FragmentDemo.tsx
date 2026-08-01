import { UniversalTextSelection } from "@round-selection/react";

export function FragmentDemo() {
  return (
    <div className="project-stage document-stage">
      <div className="document-meta"><span>Field Note 14</span><span>12:42 UTC</span></div>
      <UniversalTextSelection mode="fragment-fill" contentClassName="field-note" selectionColor="rgb(51 144 236 / .42)">
        <h2>Unmodified fragments</h2>
        <p>
          This mode paints every rectangle returned by the browser. It adds no continuity and no corner inference, making it useful when measured geometry must remain visually explicit.
        </p>
        <blockquote>What the browser measures is exactly what the reader sees.</blockquote>
      </UniversalTextSelection>
    </div>
  );
}
