import { deserialize, Document, serialize } from "@dot-paint/core";
import { useEffect, useState } from "react";
import { exportApng } from "../io/apngExport";
import type { AutosaveRecord } from "../io/autosave";
import { saveAutosave } from "../io/autosave";
import {
  DPAINT_PICKER_TYPES,
  downloadDpaintFile,
  normalizeProjectFileName,
  openDpaintFile,
  pickSaveHandle,
  supportsFileSystemAccess,
  writeToHandle,
} from "../io/fileIO";
import { exportPng } from "../io/pngExport";
import { AutosaveBrowserDialog } from "./AutosaveBrowserDialog";
import { type SaveFormat, SaveAsDialog } from "./SaveAsDialog";

interface FileMenuProps {
  document: Document;
  fileName: string | undefined;
  onOpen: (doc: Document, name: string | undefined) => void;
  onFileNameChange: (name: string | undefined) => void;
}

const DEFAULT_NAME = "untitled.dpaint";
const AUTOSAVE_DEBOUNCE_MS = 500;

export function FileMenu({ document: doc, fileName, onOpen, onFileNameChange }: FileMenuProps) {
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);

  // While auto-save is on, persist the document (debounced) whenever it
  // changes. One record per filename (autosave.ts upserts by name) - all
  // untitled documents share the same "untitled.dpaint" slot by design.
  useEffect(() => {
    if (!autoSave) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      const record: AutosaveRecord = {
        name: fileName ?? DEFAULT_NAME,
        json: serialize(doc.getState()),
        updatedAt: Date.now(),
      };
      saveAutosave(record).catch((err) => {
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
  }, [doc, autoSave, fileName]);

  async function handleOpen() {
    try {
      const result = await openDpaintFile();
      if (!result) return;
      const state = deserialize(result.json);
      onOpen(new Document(state), result.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleRestore(record: AutosaveRecord) {
    try {
      const state = deserialize(record.json);
      onOpen(new Document(state), record.name);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  /** Always resolves a new destination, in the name/format/scale the user chose in the dialog. */
  async function handleSaveAs(name: string, format: SaveFormat, pngScale: number) {
    try {
      if (format === "png") {
        await exportPng(doc.getState(), name, pngScale);
        setError(null);
        return;
      }
      if (format === "apng") {
        await exportApng(doc.getState(), name, pngScale);
        setError(null);
        return;
      }

      const state = doc.getState();
      const fullName = normalizeProjectFileName(name, state.frames.length);
      const json = serialize(state);

      if (supportsFileSystemAccess()) {
        const handle = await pickSaveHandle(fullName, DPAINT_PICKER_TYPES);
        if (!handle) return; // user cancelled
        await writeToHandle(handle, json);
        onFileNameChange(handle.name);
      } else {
        downloadDpaintFile(json, fullName);
        onFileNameChange(fullName);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const suggestedName = (fileName ?? DEFAULT_NAME).replace(/\.dpaint(-anim)?$/, "");

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={handleOpen}>
        Open…
      </button>
      <SaveAsDialog
        suggestedName={suggestedName}
        documentWidth={doc.getState().width}
        documentHeight={doc.getState().height}
        isAnimation={doc.getState().frames.length > 1}
        onSave={handleSaveAs}
      />
      <AutosaveBrowserDialog onRestore={handleRestore} />
      <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
        Auto-save
      </label>
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </div>
  );
}
