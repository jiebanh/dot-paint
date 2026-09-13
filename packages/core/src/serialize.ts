import type { DotDocument } from "./document";
import type { Theme } from "./theme";

declare function btoa(data: string): string;
declare function atob(data: string): string;

export const FILE_FORMAT_VERSION = 2;

interface DotPaintFileV2 {
  version: 2;
  width: number;
  height: number;
  pixels: string;
  theme: Theme;
}

/** v1 documents held multiple themes plus an activeThemeId; v2 embeds a single theme. */
interface DotPaintFileV1 {
  version: 1;
  width: number;
  height: number;
  pixels: string;
  themes: Theme[];
  activeThemeId: string;
}

export function serialize(doc: DotDocument): string {
  const file: DotPaintFileV2 = {
    version: FILE_FORMAT_VERSION,
    width: doc.width,
    height: doc.height,
    pixels: bytesToBase64(doc.pixels),
    theme: doc.theme,
  };
  return JSON.stringify(file, null, 2);
}

export function deserialize(json: string): DotDocument {
  const file = JSON.parse(json) as DotPaintFileV1 | DotPaintFileV2;

  if (file.version === 1) {
    const theme = file.themes.find((t) => t.id === file.activeThemeId) ?? file.themes[0];
    if (!theme) throw new Error("v1 .dpaint file has no themes to migrate");
    return { width: file.width, height: file.height, pixels: base64ToBytes(file.pixels), theme };
  }

  if (file.version !== FILE_FORMAT_VERSION) {
    throw new Error(`unsupported .dpaint file version: ${(file as { version: unknown }).version}`);
  }
  return { width: file.width, height: file.height, pixels: base64ToBytes(file.pixels), theme: file.theme };
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
