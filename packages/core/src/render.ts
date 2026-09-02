import { getActiveTheme, type DotDocument } from "./document";
import { TRANSPARENT_INDEX } from "./theme";

/**
 * Pure index-buffer -> RGBA lookup. No DOM/canvas dependency, so it runs
 * identically in a browser webview and the Node VSCode extension host, and is
 * the seam a future WebAssembly implementation would replace.
 */
export function render(doc: DotDocument): Uint8ClampedArray<ArrayBuffer> {
  const theme = getActiveTheme(doc);
  const out = new Uint8ClampedArray(doc.pixels.length * 4);
  for (let i = 0; i < doc.pixels.length; i++) {
    const paletteIndex = doc.pixels[i];
    const o = i * 4;
    if (paletteIndex === TRANSPARENT_INDEX || paletteIndex >= theme.colors.length) {
      continue; // Uint8ClampedArray is zero-initialized: fully transparent.
    }
    const [r, g, b, a] = hexToRgba(theme.colors[paletteIndex]);
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a;
  }
  return out;
}

function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}
