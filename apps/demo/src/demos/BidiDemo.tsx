import { UniversalTextSelection } from "@round-selection/react";

export function BidiDemo() {
  return (
    <div className="project-stage bidi-stage">
      <UniversalTextSelection
        mode="contour-union"
        radius={6}
        selectionColor="rgb(51 144 236 / .42)"
        contentClassName="bidi-copy"
      >
        <span className="article-kicker">Mixed direction</span>
        <h2>One range, multiple directions.</h2>
        <p>
          English text can include العربية and עברית inside the same visual line. Browser ranges may therefore produce multiple horizontal fragments for one line.
        </p>
        <p dir="rtl">هذا مثال عربي لاختبار اتجاه النص وتكوين مسار التحديد عبر أكثر من جزء بصري.</p>
      </UniversalTextSelection>
    </div>
  );
}
