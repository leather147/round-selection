import { UniversalTextSelection } from "@round-selection/react";

const rows = Array.from({ length: 18 }, (_, index) => ({
  id: `SEL-${String(index + 1).padStart(3, "0")}`,
  mode: ["fragment", "contour", "corners"][index % 3],
  latency: `${(0.8 + index * 0.17).toFixed(2)} ms`,
}));

export function DenseDemo() {
  return (
    <div className="project-stage dense-stage">
      <UniversalTextSelection mode="contour-union" radius={4} selectionColor="rgb(51 144 236 / .4)" contentClassName="dense-content">
        <div className="dense-heading"><div><span className="article-kicker">Dense data</span><h2>Selection matrix</h2></div><small>18 records</small></div>
        <div className="data-table" role="table">
          {rows.map((row) => (
            <div className="data-row" role="row" key={row.id}>
              <span role="cell">{row.id}</span><span role="cell">{row.mode}</span><span role="cell">stable</span><span role="cell">{row.latency}</span>
            </div>
          ))}
        </div>
      </UniversalTextSelection>
    </div>
  );
}
