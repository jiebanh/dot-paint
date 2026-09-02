import type { DotDocument } from "./document";
import type { Theme } from "./theme";

declare function btoa(data: string): string;
declare function atob(data: string): string;

export const FILE_FORMAT_VERSION = 1;

interface DotPaintFile {
  version: number;
  width: number;
  height: number;
  pixels: string;
  themes: Theme[];
  activeThemeId: string;
}

export function serialize(doc: DotDocument): string {
  const file: DotPaintFile = {
    version: FILE_FORMAT_VERSION,
    width: doc.width,
    height: doc.height,
    pixels: bytesToBase64(doc.pixels),
    themes: doc.themes,
    activeThemeId: doc.activeThemeId,
  };
  return JSON.stringify(file, null, 2);
}

export function deserialize(json: string): DotDocument {
  const file = JSON.parse(json) as DotPaintFile;
  if (file.version !== FILE_FORMAT_VERSION) {
    throw new Error(`unsupported .dpaint file version: ${file.version}`);
  }
  return {
    width: file.width,
    height: file.height,
    pixels: base64ToBytes(file.pixels),
    themes: file.themes,
    activeThemeId: file.activeThemeId,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(base64, "base64"));
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
