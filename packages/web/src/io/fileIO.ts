export interface OpenResult {
  json: string;
  name: string;
  handle?: FileSystemFileHandle;
}

/** A single-frame document; the same v3 schema as ANIMATION_FILE_EXTENSION, just named to signal "this is a still image" at a glance. */
export const PROJECT_FILE_EXTENSION = ".dpaint";
/** A multi-frame document (issue #35) - same schema/deserialize() path as .dpaint, distinguished only by name/selector. */
export const ANIMATION_FILE_EXTENSION = ".dpaint-anim";

export const DPAINT_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: "dot-paint document",
    accept: { "application/json": [PROJECT_FILE_EXTENSION, ANIMATION_FILE_EXTENSION] },
  },
];

/** Which extension a document with this many frames should be saved under. */
export function projectFileExtension(frameCount: number): string {
  return frameCount > 1 ? ANIMATION_FILE_EXTENSION : PROJECT_FILE_EXTENSION;
}

/** Ensures `name` ends with the extension appropriate for `frameCount`, swapping out either known extension if present. */
export function normalizeProjectFileName(name: string, frameCount: number): string {
  const withoutExtension = name.endsWith(ANIMATION_FILE_EXTENSION)
    ? name.slice(0, -ANIMATION_FILE_EXTENSION.length)
    : name.endsWith(PROJECT_FILE_EXTENSION)
      ? name.slice(0, -PROJECT_FILE_EXTENSION.length)
      : name;
  return `${withoutExtension}${projectFileExtension(frameCount)}`;
}

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
    input.accept = `${PROJECT_FILE_EXTENSION},${ANIMATION_FILE_EXTENSION}`;
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
