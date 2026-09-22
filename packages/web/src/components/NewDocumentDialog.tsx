import { MAX_SIZE } from "@dot-paint/core";
import { type FormEvent, useRef, useState } from "react";

interface NewDocumentDialogProps {
  onCreate: (width: number, height: number, name: string | undefined) => void;
}

const PRESET_SIZES = [8, 16, 24, 32, 48, 64, 128, 256, 512];

function validateSize(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > MAX_SIZE) {
    return `1〜${MAX_SIZE}の整数を指定してください`;
  }
  return null;
}

export function NewDocumentDialog({ onCreate }: NewDocumentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);
  const [square, setSquare] = useState(true);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open() {
    setName("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function applyWidth(value: number) {
    setWidth(value);
    if (square) setHeight(value);
  }

  function applyHeight(value: number) {
    setHeight(value);
    if (square) setWidth(value);
  }

  function toggleSquare(checked: boolean) {
    setSquare(checked);
    if (checked) setHeight(width);
  }

  function applyPreset(size: number) {
    setWidth(size);
    setHeight(size);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateSize(width) ?? validateSize(height);
    if (err) {
      setError(err);
      return;
    }
    onCreate(width, height, name.trim() || undefined);
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={open}>
        New…
      </button>
      <dialog ref={dialogRef}>
        <form onSubmit={handleSubmit}>
          <h2 style={{ marginTop: 0 }}>New document</h2>

          <label style={{ display: "block", marginBottom: 12 }}>
            name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="untitled.dpaint"
              style={{ marginLeft: 8, width: 180 }}
            />
          </label>

          <div style={{ marginBottom: 12 }}>
            <span style={{ display: "block", marginBottom: 4, fontSize: 12, opacity: 0.7 }}>presets</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {PRESET_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => applyPreset(size)}>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "block", marginBottom: 8 }}>
            <input type="checkbox" checked={square} onChange={(e) => toggleSquare(e.target.checked)} />
            square (width = height)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 48 }}>width</span>
            <input
              type="range"
              min={1}
              max={MAX_SIZE}
              value={width}
              onChange={(e) => applyWidth(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={1}
              max={MAX_SIZE}
              value={width}
              onChange={(e) => applyWidth(Number(e.target.value))}
              style={{ width: 64 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 48 }}>height</span>
            <input
              type="range"
              min={1}
              max={MAX_SIZE}
              value={height}
              disabled={square}
              onChange={(e) => applyHeight(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={1}
              max={MAX_SIZE}
              value={height}
              disabled={square}
              onChange={(e) => applyHeight(Number(e.target.value))}
              style={{ width: 64 }}
            />
          </label>

          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <button type="submit">Create</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
