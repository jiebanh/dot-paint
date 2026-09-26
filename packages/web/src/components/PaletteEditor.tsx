import type { Document, Theme } from "@dot-paint/core";
import { MAX_PALETTE_SIZE, TRANSPARENT_INDEX } from "@dot-paint/core";
import { useState } from "react";

const SWATCH_SIZE = 28;
const COLUMNS = 8;

export interface ColorPreview {
  paletteIndex: number;
  color: string;
}

interface PaletteEditorProps {
  document: Document;
  theme: Theme;
  selectedIndex: number;
  onSelect: (paletteIndex: number) => void;
  /** Live color while the top-right color panel is being dragged, shown on the selected swatch. */
  colorPreview?: ColorPreview | null;
}

export function PaletteEditor({ document: doc, theme, selectedIndex, onSelect, colorPreview }: PaletteEditorProps) {
  const [error, setError] = useState<string | null>(null);

  function renderSwatch(paletteIndex: number) {
    const isTransparent = paletteIndex === TRANSPARENT_INDEX;
    const selected = paletteIndex === selectedIndex;
    const color = selected && colorPreview ? colorPreview.color : theme.colors[paletteIndex];

    return (
      <button
        key={paletteIndex}
        type="button"
        onClick={() => onSelect(paletteIndex)}
        title={isTransparent ? "transparent" : color}
        style={{
          width: SWATCH_SIZE,
          height: SWATCH_SIZE,
          padding: 0,
          cursor: "pointer",
          background: isTransparent
            ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px"
            : color,
          border: selected ? "2px solid #000" : "1px solid #999",
          boxSizing: "border-box",
        }}
      />
    );
  }

  function handleAddColor() {
    try {
      const newIndex = theme.colors.length;
      doc.addThemeColor();
      onSelect(newIndex);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const colorIndices = theme.colors.map((_, i) => i).filter((i) => i !== TRANSPARENT_INDEX);
  const atMax = theme.colors.length >= MAX_PALETTE_SIZE;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {renderSwatch(TRANSPARENT_INDEX)}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS}, ${SWATCH_SIZE}px)`,
          gap: 4,
        }}
      >
        {colorIndices.map((paletteIndex) => renderSwatch(paletteIndex))}
        <button
          type="button"
          onClick={handleAddColor}
          disabled={atMax}
          title={atMax ? `palette is at the ${MAX_PALETTE_SIZE}-color maximum` : "add a palette color"}
          aria-label="add a palette color"
          style={{
            width: SWATCH_SIZE,
            height: SWATCH_SIZE,
            padding: 0,
            cursor: atMax ? "not-allowed" : "pointer",
            border: "1px dashed #999",
            background: "#fff",
            color: "#666",
            fontSize: 16,
            lineHeight: 1,
            opacity: atMax ? 0.4 : 1,
          }}
        >
          +
        </button>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 12, color: "crimson" }}>{error}</p>
      )}
    </div>
  );
}
