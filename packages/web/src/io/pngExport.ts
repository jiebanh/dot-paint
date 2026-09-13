import type { DotDocument } from "@dot-paint/core";
import { render } from "@dot-paint/core";
import { downloadBlob, pickSaveHandle, supportsFileSystemAccess, writeToHandle } from "./fileIO";

const PNG_PICKER_TYPES: FilePickerAcceptType[] = [
  { description: "PNG image", accept: { "image/png": [".png"] } },
];

/** Renders at 1 document pixel = 1 image pixel, independent of the on-screen editing zoom. */
export function renderToPngBlob(doc: DotDocument): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context is not available");

  const rgba = render(doc);
  ctx.putImageData(new ImageData(rgba, doc.width, doc.height), 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("failed to encode PNG"));
    }, "image/png");
  });
}

export async function exportPng(doc: DotDocument, suggestedName: string): Promise<void> {
  const name = suggestedName.endsWith(".png") ? suggestedName : `${suggestedName}.png`;
  const blob = await renderToPngBlob(doc);

  if (supportsFileSystemAccess()) {
    const handle = await pickSaveHandle(name, PNG_PICKER_TYPES);
    if (!handle) return; // user cancelled
    await writeToHandle(handle, blob);
    return;
  }

  downloadBlob(blob, name);
}
