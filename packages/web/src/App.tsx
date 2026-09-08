import type { BrushShape } from "@dot-paint/core";
import { createDocument, createTheme, Document } from "@dot-paint/core";
import { useMemo, useState } from "react";
import { Canvas, type PaintTool } from "./components/Canvas";
import { PaletteEditor } from "./components/PaletteEditor";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { useDocument } from "./hooks/useDocument";

const DEFAULT_COLORS = [
  "#1a1a1a",
  "#ffffff",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
];

const NIGHT_COLORS = [
  "#e8e8f0",
  "#0d0d14",
  "#8e2de2",
  "#1b6ca8",
  "#0f9b8e",
  "#c9a227",
  "#d63aa0",
  "#a8471f",
];

function createDefaultDocument(): Document {
  const defaultTheme = createTheme("default", "Default", DEFAULT_COLORS);
  const nightTheme = createTheme("night", "Night", NIGHT_COLORS);
  return new Document(createDocument(16, 16, [defaultTheme, nightTheme], "default"));
}

export function App() {
  const doc = useMemo(() => createDefaultDocument(), []);
  const state = useDocument(doc);
  const [tool, setTool] = useState<PaintTool>({ shape: "square", size: 1, paletteIndex: 1 });

  const activeTheme = state.themes.find((t) => t.id === state.activeThemeId)!;

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>dot-paint</h1>
      <p>
        {state.width}×{state.height}, theme "{state.activeThemeId}"
      </p>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Canvas document={doc} tool={tool} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <fieldset>
            <legend>brush</legend>
            {(["square", "circle"] as BrushShape[]).map((shape) => (
              <label key={shape} style={{ display: "block" }}>
                <input
                  type="radio"
                  name="shape"
                  checked={tool.shape === shape}
                  onChange={() => setTool((t) => ({ ...t, shape }))}
                />
                {shape}
              </label>
            ))}
            <label style={{ display: "block", marginTop: 8 }}>
              size
              <input
                type="number"
                min={1}
                max={8}
                value={tool.size}
                onChange={(e) => setTool((t) => ({ ...t, size: Number(e.target.value) || 1 }))}
                style={{ width: 48, marginLeft: 8 }}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>color</legend>
            <PaletteEditor
              document={doc}
              theme={activeTheme}
              selectedIndex={tool.paletteIndex}
              onSelect={(paletteIndex) => setTool((t) => ({ ...t, paletteIndex }))}
            />
          </fieldset>

          <fieldset>
            <legend>theme</legend>
            <ThemeSwitcher document={doc} state={state} />
          </fieldset>
        </div>
      </div>
    </main>
  );
}
