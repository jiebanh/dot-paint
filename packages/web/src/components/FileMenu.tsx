import { deserialize, Document, serialize } from "@dot-paint/core";
import { useRef, useState } from "react";
import {
  downloadDpaintFile,
  openDpaintFile,
  pickSaveHandle,
  promptFileName,
  supportsFileSystemAccess,
  writeToHandle,
} from "../io/fileIO";

interface FileMenuProps {
  document: Document;
  onOpen: (doc: Document) => void;
}

const DEFAULT_NAME = "untitled.dpaint";

export function FileMenu({ document: doc, onOpen }: FileMenuProps) {
  // File System Access API handle for the current file, when supported.
  const handleRef = useRef<FileSystemFileHandle | undefined>(undefined);
  // Last confirmed filename, used to save quietly (no prompt) without the API.
  const filenameRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

  /** Resolves a destination and writes to it. `forcePrompt` makes "Save As" always ask, even when one is already known. */
  async function saveTo(forcePrompt: boolean) {
    const json = serialize(doc.getState());

    if (!forcePrompt && handleRef.current) {
      await writeToHandle(handleRef.current, json);
      return;
    }

    if (supportsFileSystemAccess()) {
      const handle = await pickSaveHandle(filenameRef.current ?? DEFAULT_NAME);
      if (!handle) return; // user cancelled
      await writeToHandle(handle, json);
      handleRef.current = handle;
      filenameRef.current = handle.name;
      return;
    }

    if (!forcePrompt && filenameRef.current) {
      downloadDpaintFile(json, filenameRef.current);
      return;
    }

    const name = promptFileName(filenameRef.current ?? DEFAULT_NAME);
    if (name === null) return; // user cancelled
    downloadDpaintFile(json, name);
    filenameRef.current = name;
  }

  async function handleSave() {
    try {
      await saveTo(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSaveAs() {
    try {
      await saveTo(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={handleOpen}>
        Open…
      </button>
      <button type="button" onClick={handleSave}>
        Save
      </button>
      <button type="button" onClick={handleSaveAs}>
        Save As…
      </button>
      {error && <span style={{ color: "crimson" }}>{error}</span>}
    </div>
  );
}
