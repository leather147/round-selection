import { UniversalTextSelection } from "@round-selection/react";

export function ContourDemo() {
  return (
    <div className="project-stage article-stage">
      <div className="article-kicker">Editorial / continuous contour</div>
      <UniversalTextSelection
        mode="contour-union"
        radius={7}
        horizontalPadding={2}
        verticalPadding={1}
        selectionColor="rgb(51 144 236 / .42)"
        contentClassName="feature-article"
      >
        <h2>The paragraph becomes one shape.</h2>
        <p>
          Select from the middle of the first line into the final sentence. The renderer groups visual lines, computes their union, traces every boundary and rounds both convex and concave turns.
        </p>
        <p>
          Disconnected regions and holes remain valid because the result is a compound SVG path with an even-odd fill rule.
        </p>
      </UniversalTextSelection>
    </div>
  );
}
