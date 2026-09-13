import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";

interface ColorPickerPanelProps {
  paletteIndex: number;
  color: string;
  disabled?: boolean;
  onPreview: (hex: string) => void;
  onCommit: (hex: string) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : (d / max) * 100, max * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const sf = s / 100;
  const vf = v / 100;
  const c = vf * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vf - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hexToHsv(hex: string): [number, number, number] {
  return rgbToHsv(...hexToRgb(hex));
}

function hsvToHex(h: number, s: number, v: number): string {
  return rgbToHex(...hsvToRgb(h, s, v));
}

function isValidHex(value: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(value);
}

const PANEL_STYLE: React.CSSProperties = {
  width: 220,
  padding: 12,
  background: "#fff",
  color: "#111",
  border: "1px solid #999",
  borderRadius: 6,
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

/**
 * Docked inline above the brush controls (was fixed to the top right of the
 * viewport; moved in-flow for now), always editing whatever palette index is
 * currently selected for painting - no separate open/close step, no Escape
 * handling (both were reported as unintuitive/annoying: issue #15 plus
 * follow-up feedback). A drag on the square/slider previews live and commits
 * on release; typing a hex commits on blur or Enter.
 */
export function ColorPickerPanel({ paletteIndex, color, disabled, onPreview, onCommit }: ColorPickerPanelProps) {
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const [hsv, setHsv] = useState(() => {
    const [h, s, v] = disabled ? [0, 0, 0] : hexToHsv(color);
    return { h, s, v };
  });
  const draft = hsvToHex(hsv.h, hsv.s, hsv.v);
  const [hexInput, setHexInput] = useState(draft);

  useEffect(() => {
    if (disabled) return;
    const [h, s, v] = hexToHsv(color);
    setHsv({ h, s, v });
    setHexInput(color);
    // Resync whenever the edited swatch or its committed color changes (switching
    // swatches, undo/redo) - not while dragging, since color only changes on commit.
  }, [color, disabled, paletteIndex]);

  if (disabled) {
    return (
      <div style={PANEL_STYLE}>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>Select a color swatch to edit its color.</p>
      </div>
    );
  }

  function updateHsv(next: Partial<typeof hsv>) {
    const merged = { ...hsv, ...next };
    setHsv(merged);
    setHexInput(hsvToHex(merged.h, merged.s, merged.v));
    onPreview(hsvToHex(merged.h, merged.s, merged.v));
  }

  function commit() {
    onCommit(draft);
  }

  function pointFromEvent(ref: React.RefObject<HTMLDivElement | null>, e: PointerEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }

  function dragHandlers(onMove: (e: PointerEvent<HTMLDivElement>) => void) {
    return {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onMove(e);
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (e.buttons !== 1) return;
        onMove(e);
      },
      onPointerUp: () => commit(),
    };
  }

  function handleHexInput(value: string) {
    setHexInput(value);
    if (!isValidHex(value)) return;
    const hex = value.startsWith("#") ? value : `#${value}`;
    const [h, s, v] = hexToHsv(hex);
    setHsv({ h, s, v });
    onPreview(hex);
  }

  function handleHexKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
  }

  return (
    <div style={PANEL_STYLE}>
      <div
        ref={svRef}
        {...dragHandlers((e) => {
          const { x, y } = pointFromEvent(svRef, e);
          updateHsv({ s: x * 100, v: (1 - y) * 100 });
        })}
        style={{
          position: "relative",
          width: "100%",
          height: 140,
          borderRadius: 4,
          cursor: "crosshair",
          touchAction: "none",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        ref={hueRef}
        {...dragHandlers((e) => {
          const { x } = pointFromEvent(hueRef, e);
          updateHsv({ h: x * 360 });
        })}
        style={{
          position: "relative",
          width: "100%",
          height: 14,
          borderRadius: 4,
          cursor: "pointer",
          touchAction: "none",
          background: "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${(hsv.h / 360) * 100}%`,
            top: "50%",
            width: 10,
            height: 18,
            borderRadius: 3,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
            transform: "translate(-50%, -50%)",
            background: `hsl(${hsv.h}, 100%, 50%)`,
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, background: draft, border: "1px solid #999", flexShrink: 0 }} />
        <input
          value={hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          onKeyDown={handleHexKeyDown}
          onBlur={commit}
          style={{ flex: 1, fontFamily: "monospace", minWidth: 0 }}
        />
      </div>
    </div>
  );
}
