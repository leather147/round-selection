"use client";

import {
  UniversalTextSelection,
  type SelectionRenderMode,
  type SelectionSnapshot,
} from "@round-selection/react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { useMemo, useState } from "react";

import { Reveal } from "./Reveal";

const methods: Array<{
  mode: SelectionRenderMode;
  index: string;
  title: string;
  eyebrow: string;
  description: string;
  steps: string[];
}> = [
  {
    mode: "fragment-fill",
    index: "01",
    title: "Fragment fill",
    eyebrow: "Direct geometry",
    description:
      "Every browser-measured line fragment is painted independently. It is the strictest, cheapest rendering path and the closest visual description of the platform geometry.",
    steps: ["Selection range", "Client rectangles", "One layer per fragment"],
  },
  {
    mode: "contour-union",
    index: "02",
    title: "Contour union",
    eyebrow: "Continuous geometry",
    description:
      "Line fragments are normalized, unioned and traced into one rounded SVG contour, including concave turns, disconnected regions and multiline silhouettes.",
    steps: ["Normalize lines", "Sweep rectangle union", "Rounded SVG contour"],
  },
  {
    mode: "adjacent-corners",
    index: "03",
    title: "Adjacent corners",
    eyebrow: "Layered geometry",
    description:
      "Neighbouring left and right edges determine outer, inner and flat corners. DOM layers and surface-colored cutouts create the final shape.",
    steps: ["Compare neighbours", "Classify corners", "DOM layers + cutouts"],
  },
];

const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL ?? "http://localhost:3001";

const codeSample = `import { UniversalTextSelection } from "@round-selection/react";
import "@round-selection/react/styles.css";

<UniversalTextSelection
  mode="contour-union"
  radius={6}
  selectionColor="rgb(51 144 236 / .42)"
>
  <article>{children}</article>
</UniversalTextSelection>`;

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12.5 10 16l8-9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-4.7 0-1 .4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.7.7 1 1.6 1 2.6 0 3.6-2.4 4.4-4.6 4.7.4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5Z" />
    </svg>
  );
}

function LiveSelection({ mode }: { mode: SelectionRenderMode }) {
  const [snapshot, setSnapshot] = useState<SelectionSnapshot | null>(null);
  const selectedWords = snapshot?.text.trim().split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <div className="live-window glass-panel">
      <div className="window-bar">
        <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
        <span>live.selection</span>
        <span className="window-state">{selectedWords ? `${selectedWords} words` : "select text"}</span>
      </div>
      <UniversalTextSelection
        mode={mode}
        radius={mode === "fragment-fill" ? 0 : 6}
        selectionColor="rgb(51 144 236 / 0.42)"
        surfaceColor="#111419"
        horizontalPadding={1.5}
        verticalPadding={1}
        contentClassName="selection-copy"
        onSelectionChange={setSnapshot}
      >
        <p className="drop-cap">
          Selection is a transient interface. It should follow the rhythm of a line,
          preserve the shape of a paragraph and disappear without changing the document.
        </p>
        <p>
          Drag across these words. The browser keeps ownership of the range and copying;
          the component only replaces the visual surface beneath it.
        </p>
      </UniversalTextSelection>
      <div className="window-caption">
        <span>{mode}</span>
        <span>React 19 · Selection API</span>
      </div>
    </div>
  );
}

export function LandingExperience() {
  const [mode, setMode] = useState<SelectionRenderMode>("contour-union");
  const activeMethod = useMemo(
    () => methods.find((method) => method.mode === mode) ?? methods[1]!,
    [mode],
  );
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.25,
  });

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1] }}>
        <m.div className="scroll-progress" style={{ scaleX: progress }} />
        <div className="site-shell">
          <div className="ambient ambient-a" aria-hidden="true" />
          <div className="ambient ambient-b" aria-hidden="true" />

          <header className="masthead glass-panel">
            <a className="brand" href="#top" aria-label="Round Selection home">
              <span className="brand-mark">R</span>
              <span>Round Selection</span>
            </a>
            <nav aria-label="Primary navigation">
              <a href="#methods">Methods</a>
              <a href="#architecture">Architecture</a>
              <a href="#install">Install</a>
            </nav>
            <a
              className="icon-link"
              href="https://github.com/leather147/round-selection"
              aria-label="Open GitHub repository"
            >
              <GitHubIcon />
            </a>
          </header>

          <main id="top">
            <section className="hero section-grid">
              <div className="hero-copy">
                <m.div
                  className="issue-line"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                >
                  <span>Volume 01</span><span>React 19</span><span>August 2026</span>
                </m.div>
                <h1 className="hero-title" aria-label="Text selection with shape">
                  {["Text selection", "with shape."].map((line, index) => (
                    <span className="title-mask" key={line}>
                      <m.span
                        initial={reduceMotion ? false : { y: "110%", filter: "blur(12px)" }}
                        animate={{ y: "0%", filter: "blur(0px)" }}
                        transition={{ duration: 0.9, delay: 0.08 + index * 0.12 }}
                      >
                        {line}
                      </m.span>
                    </span>
                  ))}
                </h1>
                <m.p
                  className="hero-deck"
                  initial={reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.72, delay: 0.38 }}
                >
                  A compact React component that redraws native browser selection as strict
                  fragments, a continuous rounded contour, or layered neighbour-aware corners.
                </m.p>
                <m.div
                  className="hero-actions"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.52 }}
                >
                  <a className="button button-primary" href="#playground">
                    Open playground <ArrowIcon />
                  </a>
                  <a className="button button-secondary" href={demoUrl}>
                    Demo laboratory
                  </a>
                </m.div>
              </div>

              <m.aside
                className="hero-note glass-panel"
                initial={reduceMotion ? false : { opacity: 0, x: 24, filter: "blur(12px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.82, delay: 0.28 }}
              >
                <span className="note-number">No. 01</span>
                <p>
                  Native range semantics stay intact. The custom layer is visual only,
                  pointer-transparent and removed when it cannot be measured safely.
                </p>
                <div className="note-rule" />
                <span>Copying · accessibility · fallback</span>
              </m.aside>
            </section>

            <Reveal as="section" className="ticker glass-panel" delay={0.04}>
              <span>No runtime dependency beyond React</span>
              <span>Three rendering methods</span>
              <span>Horizontal sweep union</span>
              <span>Native selection preserved</span>
            </Reveal>

            <section id="playground" className="playground section-grid content-section">
              <Reveal className="section-heading">
                <span className="kicker">Interactive proof</span>
                <h2>Choose the geometry.<br />Then select the copy.</h2>
              </Reveal>
              <Reveal className="method-switcher glass-panel" delay={0.08}>
                {methods.map((method) => (
                  <button
                    key={method.mode}
                    type="button"
                    onClick={() => setMode(method.mode)}
                    className={mode === method.mode ? "is-active" : undefined}
                  >
                    {mode === method.mode && (
                      <m.span layoutId="active-method" className="active-method" />
                    )}
                    <span>{method.index}</span>
                    <strong>{method.title}</strong>
                  </button>
                ))}
              </Reveal>
              <Reveal className="live-cell" delay={0.12}>
                <LiveSelection mode={mode} />
              </Reveal>
              <Reveal className="method-copy" delay={0.16}>
                <span className="kicker">{activeMethod.eyebrow}</span>
                <m.div key={activeMethod.mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <h3>{activeMethod.title}</h3>
                  <p>{activeMethod.description}</p>
                  <ol>
                    {activeMethod.steps.map((step, index) => (
                      <li key={step}><span>0{index + 1}</span>{step}</li>
                    ))}
                  </ol>
                </m.div>
              </Reveal>
            </section>

            <section id="methods" className="methods content-section">
              <Reveal className="section-heading wide-heading">
                <span className="kicker">The three methods</span>
                <h2>One public API.<br />Three different surfaces.</h2>
              </Reveal>
              <div className="method-grid">
                {methods.map((method, index) => (
                  <Reveal className="method-card glass-panel" delay={index * 0.07} key={method.mode}>
                    <div className="card-index">{method.index}</div>
                    <span className="kicker">{method.eyebrow}</span>
                    <h3>{method.title}</h3>
                    <p>{method.description}</p>
                    <div className={`geometry geometry-${index + 1}`} aria-hidden="true">
                      <i /><i /><i />
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>

            <section id="architecture" className="architecture section-grid content-section">
              <Reveal className="section-heading">
                <span className="kicker">Architecture</span>
                <h2>Measured once.<br />Rendered deliberately.</h2>
              </Reveal>
              <div className="architecture-list">
                {[
                  ["01", "Observe", "Selection, scroll, resize, font and DOM changes are coalesced into the owning window’s animation frame."],
                  ["02", "Measure", "The selected Range is clipped to the component and converted from viewport rectangles into local coordinates."],
                  ["03", "Normalize", "Fragments are deduplicated, grouped into visual lines and bridged only when the configured gap is safe."],
                  ["04", "Render", "A renderer receives immutable geometry. Native selection remains the semantic source of truth."],
                ].map(([number, title, copy], index) => (
                  <Reveal className="architecture-row" delay={index * 0.05} key={number}>
                    <span>{number}</span><h3>{title}</h3><p>{copy}</p>
                  </Reveal>
                ))}
              </div>
            </section>

            <section className="metrics content-section">
              <Reveal className="metric-lead glass-panel">
                <span className="kicker">Performance note</span>
                <strong>6.6–12.4 ms</strong>
                <p>Measured contour construction for a synthetic 500-line selection in the validation environment.</p>
              </Reveal>
              {[
                ["0", "continuous animation loops"],
                ["1", "client island on the landing"],
                ["3", "rendering methodologies"],
                ["150", "randomized union fixtures"],
              ].map(([value, label], index) => (
                <Reveal className="metric" delay={0.05 * index} key={label}>
                  <strong>{value}</strong><span>{label}</span>
                </Reveal>
              ))}
            </section>

            <section id="install" className="install section-grid content-section">
              <Reveal className="section-heading">
                <span className="kicker">Install</span>
                <h2>Keep the document.<br />Replace the paint.</h2>
                <p>The component is shipped from the workspace package and works in both the Next.js and Vite applications.</p>
              </Reveal>
              <Reveal className="code-panel glass-panel" delay={0.08}>
                <div className="code-header"><span>tsx</span><span>UniversalTextSelection</span></div>
                <pre><code>{codeSample}</code></pre>
              </Reveal>
              <Reveal className="checks" delay={0.12}>
                {[
                  "React 19 ref prop",
                  "Selection API semantics",
                  "Forced-colors fallback",
                  "Reduced-motion support",
                  "ShadowRoot composed ranges",
                  "Mobile-safe native scrolling",
                ].map((item) => (
                  <div key={item}><MarkIcon /><span>{item}</span></div>
                ))}
              </Reveal>
            </section>

            <Reveal as="section" className="final-call glass-panel content-section">
              <span className="kicker">Continue reading</span>
              <h2>Six focused React demos.<br />One shared geometry package.</h2>
              <p>Open the laboratory to inspect editorial, documentation, chat, bidirectional, dense and stress-test scenarios.</p>
              <a className="button button-primary" href={demoUrl}>Enter demo laboratory <ArrowIcon /></a>
            </Reveal>
          </main>

          <footer>
            <span>Round Selection · MIT</span>
            <span>React 19 · Next.js 16 · Vite 8</span>
            <a href="#top">Back to top ↑</a>
          </footer>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
