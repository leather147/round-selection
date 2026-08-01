"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  UniversalTextSelection,
  type SelectionRenderMode,
  type UniversalTextSelectionHandle,
} from "./UniversalTextSelection";

export function SelectionDemo() {
  const [mode, setMode] = useState<SelectionRenderMode>("contour-union");
  const selectionRef = useRef<UniversalTextSelectionHandle>(null);

  return (
    <section style={{ background: "#101419", color: "#f2f5f7", padding: 24 }}>
      <label>
        Renderer:{" "}
        <select
          value={mode}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setMode(event.target.value as SelectionRenderMode)
          }
        >
          <option value="fragment-fill">Fragment fill</option>
          <option value="contour-union">Contour union</option>
          <option value="adjacent-corners">Adjacent corners</option>
        </select>
      </label>

      <button type="button" onClick={() => selectionRef.current?.clear()}>
        Clear custom geometry
      </button>

      <UniversalTextSelection
        ref={selectionRef}
        mode={mode}
        selectionColor="rgb(51 144 236 / 0.42)"
        surfaceColor="#101419"
        radius={6}
        style={{ marginTop: 16, maxWidth: 560, lineHeight: 1.55 }}
      >
        Выдели несколько строк этого текста. Компонент сохранит обычный
        Selection API, копирование и доступность, но фон выделения нарисует
        отдельным слоем.
      </UniversalTextSelection>
    </section>
  );
}
