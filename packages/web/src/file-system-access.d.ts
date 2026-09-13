// Minimal ambient types for the File System Access API (Chromium-only, not yet
// part of TypeScript's bundled lib.dom.d.ts). Declares only what packages/web/src/io/fileIO.ts uses.

interface FileSystemFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, `.${string}`[]>;
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  multiple?: boolean;
}

interface SaveFilePickerOptions {
  types?: FilePickerAcceptType[];
  suggestedName?: string;
}

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
