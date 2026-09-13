export interface OpenResult {
  json: string;
  name: string;
  handle?: FileSystemFileHandle;
}

export const DPAINT_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "dot-paint document",
    accept: { "application/json": [".dpaint"] },
  },
];

export function supportsFileSystemAccess(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export async function openDpaintFile(): Promise<OpenResult | null> {
  if (supportsFileSystemAccess()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker({ types: DPAINT_PICKER_TYPES });
    } catch (err) {
      if (isAbortError(err)) return null;
      throw err;
    }
    const handle = handles[0];
    const file = await handle.getFile();
    return { json: await file.text(), name: handle.name, handle };
  }
  return openViaInput();
}

function openViaInput(): Promise<OpenResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dpaint";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((json) => resolve({ json, name: file.name }));
    };
    input.click();
  });
}

export async function writeToHandle(handle: FileSystemFileHandle, data: string | Blob): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

/** Always asks the user to choose a destination. Returns undefined if they cancel. */
export async function pickSaveHandle(
  suggestedName: string,
  types: FilePickerAcceptType[] = DPAINT_PICKER_TYPES,
): Promise<FileSystemFileHandle | undefined> {
  try {
    return await window.showSaveFilePicker({ suggestedName, types });
  } catch (err) {
    if (isAbortError(err)) return undefined;
    throw err;
  }
}

/** Always asks the user to confirm/change a filename. Returns null if they cancel. */
export function promptFileName(suggestedName: string): string | null {
  const input = window.prompt("Save as:", suggestedName);
  if (!input) return null;
  return input.endsWith(".dpaint") ? input : `${input}.dpaint`;
}

/** Downloads under an already-known filename, no prompt. */
export function downloadDpaintFile(json: string, filename: string): void {
  downloadBlob(new Blob([json], { type: "application/json" }), filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
