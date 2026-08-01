import { UniversalTextSelection } from "@round-selection/react";

export function AdjacentDemo() {
  return (
    <div className="project-stage docs-stage">
      <aside className="docs-rail"><span>API</span><i /><i /><i /></aside>
      <UniversalTextSelection
        mode="adjacent-corners"
        radius={5}
        surfaceColor="#12161c"
        selectionColor="rgb(51 144 236 / .4)"
        contentClassName="docs-copy"
      >
        <span className="api-path">Component / Geometry / Corners</span>
        <h2>Neighbour-aware layers</h2>
        <p>
          Each line fragment is a DOM rectangle. Its boundaries are compared with fragments above and below to classify external, internal and flat corners.
        </p>
        <p>
          Internal corners are cut from the selection color with small layers matching the document surface.
        </p>
      </UniversalTextSelection>
    </div>
  );
}
