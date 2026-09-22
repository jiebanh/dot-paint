import { useRef } from "react";
import { type AppSettings, DEFAULT_SETTINGS, GUIDE_DIVISION_OPTIONS } from "../settings";

interface OptionsDialogProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

export function OptionsDialog({ settings, onChange }: OptionsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        Options…
      </button>
      <dialog ref={dialogRef}>
        <h2 style={{ marginTop: 0 }}>Options</h2>

        <fieldset style={{ marginBottom: 12 }}>
          <legend>transparent area</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            color A
            <input
              type="color"
              value={settings.transparentCheckerColorA}
              onChange={(e) => update("transparentCheckerColorA", e.target.value)}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            color B
            <input
              type="color"
              value={settings.transparentCheckerColorB}
              onChange={(e) => update("transparentCheckerColorB", e.target.value)}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            checker size
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={settings.transparentCheckerUnit}
              onChange={(e) => update("transparentCheckerUnit", Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {settings.transparentCheckerUnit.toFixed(1)}
            </span>
          </label>
        </fieldset>

        <fieldset style={{ marginBottom: 12 }}>
          <legend>guides</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={settings.guidesEnabled}
              onChange={(e) => update("guidesEnabled", e.target.checked)}
            />
            show guides
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              opacity: settings.guidesEnabled ? 1 : 0.5,
            }}
          >
            divisions
            <select
              disabled={!settings.guidesEnabled}
              value={settings.guideDivisions}
              onChange={(e) => update("guideDivisions", Number(e.target.value))}
            >
              {GUIDE_DIVISION_OPTIONS.map((divisions) => (
                <option key={divisions} value={divisions}>
                  1/{divisions}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, opacity: settings.guidesEnabled ? 1 : 0.5 }}>
            color
            <input
              type="color"
              disabled={!settings.guidesEnabled}
              value={settings.guideColor}
              onChange={(e) => update("guideColor", e.target.value)}
            />
          </label>
        </fieldset>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          canvas background
          <input
            type="color"
            value={settings.canvasBackgroundColor}
            onChange={(e) => update("canvasBackgroundColor", e.target.value)}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          page background
          <input
            type="color"
            value={settings.pageBackgroundColor}
            onChange={(e) => update("pageBackgroundColor", e.target.value)}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button type="button" onClick={() => onChange(DEFAULT_SETTINGS)}>
            Reset to defaults
          </button>
          <button type="button" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
