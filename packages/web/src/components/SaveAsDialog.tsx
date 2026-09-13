import { type FormEvent, useRef, useState } from "react";

export type SaveFormat = "dpaint" | "png";

interface SaveAsDialogProps {
  suggestedName: string;
  onSave: (name: string, format: SaveFormat) => void;
}

export function SaveAsDialog({ suggestedName, onSave }: SaveAsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(suggestedName);
  const [format, setFormat] = useState<SaveFormat>("dpaint");
  const [error, setError] = useState<string | null>(null);

  function open() {
    setName(suggestedName);
    setError(null);
    dialogRef.current?.showModal();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("ファイル名を入力してください");
      return;
    }
    onSave(name.trim(), format);
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
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginLeft: 8, width: 180 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            format
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as SaveFormat)}
              style={{ marginLeft: 8 }}
            >
              <option value="dpaint">.dpaint (project)</option>
              <option value="png">.png (image)</option>
            </select>
          </label>
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
