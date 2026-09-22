import { type FormEvent, useRef, useState } from "react";

export type SaveFormat = "dpaint" | "png";

const MAX_OUTPUT_SIZE = 512;

interface SaveAsDialogProps {
  suggestedName: string;
  documentWidth: number;
  documentHeight: number;
  onSave: (name: string, format: SaveFormat, pngScale: number) => void;
}

export function SaveAsDialog({ suggestedName, documentWidth, documentHeight, onSave }: SaveAsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(suggestedName);
  const [format, setFormat] = useState<SaveFormat>("dpaint");
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Upscaling is nearest-neighbor pixel replication (core.upscaleRgba), so
  // scale must stay a whole number - capped so neither side exceeds MAX_OUTPUT_SIZE.
  const maxScale = Math.max(1, Math.floor(MAX_OUTPUT_SIZE / Math.max(documentWidth, documentHeight)));
  const clampedScale = Math.min(scale, maxScale);
  const actualWidth = documentWidth * clampedScale;
  const actualHeight = documentHeight * clampedScale;

  function open() {
    setName(suggestedName);
    setScale(1);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("ファイル名を入力してください");
      return;
    }
    onSave(name.trim(), format, clampedScale);
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={open}>
        Save As…
      </button>
      <dialog ref={dialogRef}>
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>Save As</h2>
          <label style={{ display: "block", marginBottom: 8 }}>
            name
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ marginLeft: 8, width: 180 }} />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            format
            <select value={format} onChange={(e) => setFormat(e.target.value as SaveFormat)} style={{ marginLeft: 8 }}>
              <option value="dpaint">.dpaint (project)</option>
              <option value="png">.png (image)</option>
            </select>
          </label>
          {format === "png" && (
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                scale
                <input
                  type="range"
                  min={1}
                  max={maxScale}
                  value={clampedScale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  min={1}
                  max={maxScale}
                  value={clampedScale}
                  onChange={(e) => setScale(Number(e.target.value) || 1)}
                  style={{ width: 48 }}
                />
              </label>
              <p style={{ margin: "8px 0 0", display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>
                  {actualWidth} × {actualHeight}
                </span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>px output (max {MAX_OUTPUT_SIZE}px)</span>
              </p>
            </div>
          )}
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <button type="submit">Save</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
