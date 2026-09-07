import type { BrushShape } from "@dot-paint/core";
import { createDocument, createTheme, Document, TRANSPARENT_INDEX } from "@dot-paint/core";
import { useMemo, useState } from "react";
import { Canvas, type PaintTool } from "./components/Canvas";
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

function createDefaultDocument(): Document {
  const theme = createTheme("default", "Default", DEFAULT_COLORS);
  return new Document(createDocument(16, 16, [theme]));
}

export function App() {
  const doc = useMemo(() => createDefaultDocument(), []);
  const state = useDocument(doc);
  const [tool, setTool] = useState<PaintTool>({ shape: "square", size: 1, paletteIndex: 1 });

  const activeTheme = state.themes.find((t) => t.id === state.activeThemeId)!;
  const swatchIndices = [TRANSPARENT_INDEX, ...DEFAULT_COLORS.map((_, i) => i + 1)];

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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: 108 }}>
              {swatchIndices.map((paletteIndex) => (
                <button
                  key={paletteIndex}
                  type="button"
                  onClick={() => setTool((t) => ({ ...t, paletteIndex }))}
                  title={paletteIndex === TRANSPARENT_INDEX ? "transparent" : activeTheme.colors[paletteIndex]}
                  style={{
                    width: 24,
                    height: 24,
                    padding: 0,
                    background:
                      paletteIndex === TRANSPARENT_INDEX
                        ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"
                        : activeTheme.colors[paletteIndex],
                    border: tool.paletteIndex === paletteIndex ? "2px solid #000" : "1px solid #999",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </main>
  );
}
