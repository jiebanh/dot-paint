const MAX_SIZE = 128;

const PRESET_SIZES = [1, 2, 4, 8, 16, 32, 64, 128] as const;

function clamp(value: number): number {
  return Math.max(1, Math.min(MAX_SIZE, Math.round(value) || 1));
}

interface BrushSizeControlProps {
  size: number;
  onChange: (size: number) => void;
}

export function BrushSizeControl({ size, onChange }: BrushSizeControlProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {PRESET_SIZES.map((preset) => (
          <button
            key={preset}
            type="button"
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
          max={MAX_SIZE}
          value={size}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={1}
          max={MAX_SIZE}
          value={size}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ width: 48 }}
        />
      </label>
    </div>
  );
}
