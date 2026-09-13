import { deserialize, Document, serialize } from "@dot-paint/core";
import { useEffect, useRef, useState } from "react";
import { loadAutosave, saveAutosave } from "../io/autosave";
import {
  DPAINT_PICKER_TYPES,
  downloadDpaintFile,
  openDpaintFile,
  pickSaveHandle,
  promptFileName,
  supportsFileSystemAccess,
  writeToHandle,
} from "../io/fileIO";
import { exportPng } from "../io/pngExport";
import { type SaveFormat, SaveAsDialog } from "./SaveAsDialog";

interface FileMenuProps {
  document: Document;
  onOpen: (doc: Document) => void;
}

const DEFAULT_NAME = "untitled.dpaint";
const AUTOSAVE_DEBOUNCE_MS = 500;

export function FileMenu({ document: doc, onOpen }: FileMenuProps) {
  // File System Access API handle for the current file, when supported.
  const handleRef = useRef<FileSystemFileHandle | undefined>(undefined);
  // Last confirmed filename, used to save quietly (no prompt) without the API.
  const filenameRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const restoredRef = useRef(false);

  // Restore a prior auto-save once, on mount.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    loadAutosave()
      .then((record) => {
        if (!record) return;
        const state = deserialize(record.json);
        filenameRef.current = record.name;
        onOpen(new Document(state));
      })
      .catch(() => {
        // best-effort restore; leave the default document in place
      });
  }, [onOpen]);

  // While auto-save is on, persist the document (debounced) whenever it changes.
  useEffect(() => {
    if (!autoSave) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      saveAutosave({ name: filenameRef.current ?? DEFAULT_NAME, json: serialize(doc.getState()) }).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    };

    persist();
    const unsubscribe = doc.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(persist, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [doc, autoSave]);

  async function handleOpen() {
    try {
      const result = await openDpaintFile();
      if (!result) return;
      const state = deserialize(result.json);
      handleRef.current = result.handle;
      filenameRef.current = result.name;
      onOpen(new Document(state));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  /** Writes back to the known file, resolving a destination first if none is known yet. Always .dpaint. */
  async function handleSave() {
    try {
      const json = serialize(doc.getState());

      if (handleRef.current) {
        await writeToHandle(handleRef.current, json);
      } else if (supportsFileSystemAccess()) {
        const handle = await pickSaveHandle(filenameRef.current ?? DEFAULT_NAME, DPAINT_PICKER_TYPES);
        if (!handle) return; // user cancelled
        await writeToHandle(handle, json);
        handleRef.current = handle;
        filenameRef.current = handle.name;
      } else if (filenameRef.current) {
        downloadDpaintFile(json, filenameRef.current);
      } else {
        const name = promptFileName(DEFAULT_NAME);
        if (name === null) return; // user cancelled
        downloadDpaintFile(json, name);
        filenameRef.current = name;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  /** Always resolves a new destination, in the name/format the user chose in the dialog. */
  async function handleSaveAs(name: string, format: SaveFormat) {
    try {
      if (format === "png") {
        await exportPng(doc.getState(), name);
        setError(null);
        return;
      }

      const fullName = name.endsWith(".dpaint") ? name : `${name}.dpaint`;
      const json = serialize(doc.getState());

      if (supportsFileSystemAccess()) {
        const handle = await pickSaveHandle(fullName, DPAINT_PICKER_TYPES);
        if (!handle) return; // user cancelled
        await writeToHandle(handle, json);
        handleRef.current = handle;
        filenameRef.current = handle.name;
      } else {
        downloadDpaintFile(json, fullName);
        filenameRef.current = fullName;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const suggestedName = (filenameRef.current ?? DEFAULT_NAME).replace(/\.dpaint$/, "");

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={handleOpen}>
        Open…
      </button>
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <SaveAsDialog suggestedName={suggestedName} onSave={handleSaveAs} />
      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
        Auto-save
      </label>
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </div>
  );
}
