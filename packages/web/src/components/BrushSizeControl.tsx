import { BRUSH_SIZE_PRESETS, MAX_BRUSH_SIZE } from "../limits";

function clamp(value: number): number {
  return Math.max(1, Math.min(MAX_BRUSH_SIZE, Math.round(value) || 1));
}

interface BrushSizeControlProps {
  size: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

export function BrushSizeControl({ size, onChange, disabled = false }: BrushSizeControlProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {BRUSH_SIZE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            style={{ fontWeight: preset === size ? "bold" : "normal" }}
          >
            {preset}
          </button>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={1}
          max={MAX_BRUSH_SIZE}
          value={size}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={1}
          max={MAX_BRUSH_SIZE}
          value={size}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ width: 48 }}
        />
      </label>
    </div>
  );
}
