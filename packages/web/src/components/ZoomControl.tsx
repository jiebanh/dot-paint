import { MAX_ZOOM, MIN_ZOOM, ZOOM_PRESETS } from "../zoom";

interface ZoomControlProps {
  zoom: number;
  onChange: (zoom: number) => void;
}

export function ZoomControl({ zoom, onChange }: ZoomControlProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {ZOOM_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            style={{ fontWeight: preset === zoom ? "bold" : "normal" }}
          >
            {preset}x
          </button>
        ))}
      </div>
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={zoom}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span style={{ width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{zoom}x</span>
    </div>
  );
}
