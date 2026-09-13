import type { Document, Theme } from "@dot-paint/core";
import { TRANSPARENT_INDEX } from "@dot-paint/core";
import { type MouseEvent, useState } from "react";

const SWATCH_SIZE = 28;
const COLUMNS = 8;

export interface ColorPreview {
  themeId: string;
  paletteIndex: number;
  color: string;
}

interface PaletteEditorProps {
  document: Document;
  theme: Theme;
  selectedIndex: number;
  onSelect: (paletteIndex: number) => void;
  onPreview: (preview: ColorPreview | null) => void;
}

export function PaletteEditor({ document: doc, theme, selectedIndex, onSelect, onPreview }: PaletteEditorProps) {
  // Live color while a picker is being dragged, for this component's own swatch button.
  const [localPreview, setLocalPreview] = useState<{ paletteIndex: number; color: string } | null>(null);

  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  /**
   * The native `input` event fires continuously while the picker is open and
   * dragging - used here for a live preview (this swatch + the canvas, via
   * onPreview) without touching Document. The native `change` event fires
   * once, when the picker closes, and is when the edit is actually committed
   * (and becomes a single undo step) via setThemeColor.
   */
  function attachHandlers(paletteIndex: number) {
    return (el: HTMLInputElement | null) => {
      if (!el) return;
      el.oninput = () => {
        setLocalPreview({ paletteIndex, color: el.value });
        onPreview({ themeId: theme.id, paletteIndex, color: el.value });
      };
      el.onchange = () => {
        doc.setThemeColor(theme.id, paletteIndex, el.value);
        setLocalPreview(null);
        onPreview(null);
      };
    };
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
        const committedColor = theme.colors[paletteIndex];
        const color = localPreview?.paletteIndex === paletteIndex ? localPreview.color : committedColor;
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
                key={committedColor} // remount to resync when the committed color changes externally (e.g. undo)
                ref={attachHandlers(paletteIndex)}
                type="color"
                defaultValue={committedColor}
                onClick={stopPropagation}
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
