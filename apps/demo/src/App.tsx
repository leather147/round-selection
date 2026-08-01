import { useEffect, useMemo, useState } from "react";

import { demoProjects } from "./demos";

const webUrl =
  import.meta.env.VITE_WEB_URL ??
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://github.com/leather147/round-selection");

function readHash() {
  const id = window.location.hash.replace(/^#\/?/, "");
  return demoProjects.some((project) => project.id === id) ? id : demoProjects[0]!.id;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

export function App() {
  const [activeId, setActiveId] = useState(readHash);

  useEffect(() => {
    const onHashChange = () => setActiveId(readHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const active = useMemo(
    () => demoProjects.find((project) => project.id === activeId) ?? demoProjects[0]!,
    [activeId],
  );
  const ActiveDemo = active.component;

  return (
    <div className="lab-shell">
      <header className="lab-header">
        <a href={webUrl} className="lab-brand"><span>R</span><strong>Demo laboratory</strong></a>
        <div className="lab-status"><i /> React 19 / local workspace</div>
        <a href="https://github.com/leather147/round-selection">Repository ↗</a>
      </header>

      <aside className="project-nav" aria-label="Demo projects">
        <div className="nav-heading"><span>Index</span><span>06 projects</span></div>
        {demoProjects.map((project) => (
          <a
            key={project.id}
            href={`#/${project.id}`}
            className={project.id === active.id ? "is-active" : undefined}
          >
            <span>{project.index}</span>
            <div><strong>{project.title}</strong><small>{project.label}</small></div>
          </a>
        ))}
      </aside>

      <main className="project-main" key={active.id}>
        <section className="project-intro">
          <div><span className="project-index">Project {active.index}</span><h1>{active.title}</h1></div>
          <div className="project-description"><p>{active.summary}</p><dl><dt>Best for</dt><dd>{active.bestFor}</dd></dl></div>
        </section>
        <section className="project-frame"><ActiveDemo /></section>
        <footer className="project-footer">
          <span>Drag to select text inside the frame.</span>
          <a href={`#/${demoProjects[(demoProjects.indexOf(active) + 1) % demoProjects.length]!.id}`}>Next project <ArrowIcon /></a>
        </footer>
      </main>
    </div>
  );
}
