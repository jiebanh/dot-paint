import { useRef, useState } from "react";
import type { AutosaveRecord } from "../io/autosave";
import { deleteAutosave, listAutosaves } from "../io/autosave";

interface AutosaveBrowserDialogProps {
  onRestore: (record: AutosaveRecord) => void;
}

export function AutosaveBrowserDialog({ onRestore }: AutosaveBrowserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [records, setRecords] = useState<AutosaveRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const list = await listAutosaves();
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setRecords(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function open() {
    await refresh();
    dialogRef.current?.showModal();
  }

  function handleLoad(record: AutosaveRecord) {
    onRestore(record);
    dialogRef.current?.close();
  }

  async function handleDelete(id: string) {
    try {
      await deleteAutosave(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <button type="button" onClick={open}>
        Restore…
      </button>
      <dialog ref={dialogRef}>
        <h2 style={{ marginTop: 0 }}>Auto-saved documents</h2>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        {records.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No auto-saved documents.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {records.map((record) => (
              <li key={record.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleLoad(record)}
                  style={{ flex: 1, textAlign: "left", display: "flex", justifyContent: "space-between", gap: 8 }}
                >
                  <span>{record.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{new Date(record.updatedAt).toLocaleString()}</span>
                </button>
                <button type="button" onClick={() => handleDelete(record.id)} aria-label={`delete ${record.name}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
