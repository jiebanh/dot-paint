import type { DotDocument } from "@dot-paint/core";
import { render, upscaleRgba } from "@dot-paint/core";
import { downloadBlob, pickSaveHandle, supportsFileSystemAccess, writeToHandle } from "./fileIO";

const PNG_PICKER_TYPES: FilePickerAcceptType[] = [
  { description: "PNG image", accept: { "image/png": [".png"] } },
];

/**
 * Renders at `scaleFactor` image pixels per document pixel (independent of
 * the on-screen editing zoom). Upscaling goes through core's upscaleRgba
 * (nearest-neighbor, pixel-replicated) rather than canvas's own scaling, so
 * so its pixel data is identical to the VSCode extension's pngjs-based export
 * (the encoded PNG bytes can still differ - different encoders).
 */
export function renderToPngBlob(doc: DotDocument, scaleFactor = 1): Promise<Blob> {
  const outWidth = doc.width * scaleFactor;
  const outHeight = doc.height * scaleFactor;

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context is not available");

  const rgba = upscaleRgba(render(doc), doc.width, doc.height, scaleFactor);
  ctx.putImageData(new ImageData(rgba, outWidth, outHeight), 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("failed to encode PNG"));
    }, "image/png");
  });
}

export async function exportPng(doc: DotDocument, suggestedName: string, scaleFactor = 1): Promise<void> {
  const name = suggestedName.endsWith(".png") ? suggestedName : `${suggestedName}.png`;
  const blob = await renderToPngBlob(doc, scaleFactor);

  if (supportsFileSystemAccess()) {
    const handle = await pickSaveHandle(name, PNG_PICKER_TYPES);
    if (!handle) return; // user cancelled
    await writeToHandle(handle, blob);
    return;
  }

  downloadBlob(blob, name);
}
