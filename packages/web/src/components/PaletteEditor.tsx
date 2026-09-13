import type { Theme } from "@dot-paint/core";
import { TRANSPARENT_INDEX } from "@dot-paint/core";

const SWATCH_SIZE = 28;
const COLUMNS = 8;

export interface ColorPreview {
  paletteIndex: number;
  color: string;
}

interface PaletteEditorProps {
  theme: Theme;
  selectedIndex: number;
  onSelect: (paletteIndex: number) => void;
  /** Live color while the top-right color panel is being dragged, shown on the selected swatch. */
  colorPreview?: ColorPreview | null;
}

export function PaletteEditor({ theme, selectedIndex, onSelect, colorPreview }: PaletteEditorProps) {
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
      })}
    </div>
  );
}
