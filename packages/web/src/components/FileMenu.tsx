import { deserialize, Document, serialize } from "@dot-paint/core";
import { useEffect, useRef, useState } from "react";
import type { AutosaveRecord } from "../io/autosave";
import { generateAutosaveId, saveAutosave } from "../io/autosave";
import { DPAINT_PICKER_TYPES, downloadDpaintFile, openDpaintFile, pickSaveHandle, supportsFileSystemAccess, writeToHandle } from "../io/fileIO";
import { exportPng } from "../io/pngExport";
import { AutosaveBrowserDialog } from "./AutosaveBrowserDialog";
import { type SaveFormat, SaveAsDialog } from "./SaveAsDialog";

interface FileMenuProps {
  document: Document;
  onOpen: (doc: Document) => void;
}

const DEFAULT_NAME = "untitled.dpaint";
const AUTOSAVE_DEBOUNCE_MS = 500;

export function FileMenu({ document: doc, onOpen }: FileMenuProps) {
  // Last confirmed filename, used as the auto-save name and the "Save As" default.
  const filenameRef = useRef<string | undefined>(undefined);
  // Which auto-save record this document is currently writing to, if any.
  const autosaveIdRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);

  // A new document identity (new/open/restore) always starts a fresh
  // auto-save entry rather than overwriting whatever was there before -
  // restoring an older snapshot and continuing to edit is then its own
  // entry, not a silent overwrite of the one you restored from.
  useEffect(() => {
    autosaveIdRef.current = undefined;
  }, [doc]);

  // While auto-save is on, persist the document (debounced) whenever it changes.
  useEffect(() => {
    if (!autoSave) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      autosaveIdRef.current ??= generateAutosaveId();
      const record: AutosaveRecord = {
        id: autosaveIdRef.current,
        name: filenameRef.current ?? DEFAULT_NAME,
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
  }, [doc, autoSave]);

  async function handleOpen() {
    try {
      const result = await openDpaintFile();
      if (!result) return;
      const state = deserialize(result.json);
      filenameRef.current = result.name;
      onOpen(new Document(state));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleRestore(record: AutosaveRecord) {
    try {
      const state = deserialize(record.json);
      filenameRef.current = record.name;
      onOpen(new Document(state));
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

      const fullName = name.endsWith(".dpaint") ? name : `${name}.dpaint`;
      const json = serialize(doc.getState());

      if (supportsFileSystemAccess()) {
        const handle = await pickSaveHandle(fullName, DPAINT_PICKER_TYPES);
        if (!handle) return; // user cancelled
        await writeToHandle(handle, json);
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
      <SaveAsDialog
        suggestedName={suggestedName}
        documentWidth={doc.getState().width}
        documentHeight={doc.getState().height}
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
