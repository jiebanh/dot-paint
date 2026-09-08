import type { Document, Theme } from "@dot-paint/core";
import { TRANSPARENT_INDEX } from "@dot-paint/core";
import type { ChangeEvent, MouseEvent } from "react";

const SWATCH_SIZE = 28;
const COLUMNS = 8;

interface PaletteEditorProps {
  document: Document;
  theme: Theme;
  selectedIndex: number;
  onSelect: (paletteIndex: number) => void;
}

export function PaletteEditor({ document: doc, theme, selectedIndex, onSelect }: PaletteEditorProps) {
  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  function handleColorChange(paletteIndex: number, e: ChangeEvent<HTMLInputElement>) {
    doc.setThemeColor(theme.id, paletteIndex, e.target.value);
  }

  const indices = theme.colors.map((_, i) => i);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMNS}, ${SWATCH_SIZE}px)`,
        gap: 4,
      }}
    >
      {indices.map((paletteIndex) => {
        const isTransparent = paletteIndex === TRANSPARENT_INDEX;
        const color = theme.colors[paletteIndex];
        const selected = paletteIndex === selectedIndex;

        return (
          <div key={paletteIndex} style={{ position: "relative", width: SWATCH_SIZE, height: SWATCH_SIZE }}>
            <button
              type="button"
              onClick={() => onSelect(paletteIndex)}
              title={isTransparent ? "transparent" : color}
              style={{
                width: "100%",
                height: "100%",
                padding: 0,
                cursor: "pointer",
                background: isTransparent
                  ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px"
                  : color,
                border: selected ? "2px solid #000" : "1px solid #999",
                boxSizing: "border-box",
              }}
            />
            {!isTransparent && (
              <input
                type="color"
                value={color}
                onClick={stopPropagation}
                onChange={(e) => handleColorChange(paletteIndex, e)}
                title="edit color"
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 12,
                  height: 12,
                  padding: 0,
                  border: "none",
                  cursor: "pointer",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
