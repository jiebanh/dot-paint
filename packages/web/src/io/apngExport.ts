import type { DotDocument } from "@dot-paint/core";
import { buildApngBytes, filterScanlines, render, upscaleRgba } from "@dot-paint/core";
import { downloadBlob, pickSaveHandle, supportsFileSystemAccess, writeToHandle } from "./fileIO";

const APNG_PICKER_TYPES: FilePickerAcceptType[] = [
  { description: "Animated PNG", accept: { "image/png": [".png"] } },
];

/** PNG's IDAT/fdAT payload is a zlib (RFC 1950) stream - CompressionStream("deflate") produces exactly that (unlike "deflate-raw"). */
async function deflateZlib(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * One frame at a time through render -> upscale -> filter -> deflate, same
 * pipeline core.apng's buildApngBytes expects. With a single frame this is
 * just a (slightly larger than canvas.toBlob's) ordinary PNG - see pngExport.ts
 * for the simpler single-frame path used elsewhere.
 */
export async function renderToApngBlob(doc: DotDocument, scaleFactor = 1): Promise<Blob> {
  const outWidth = doc.width * scaleFactor;
  const outHeight = doc.height * scaleFactor;

  const frames = await Promise.all(
    doc.frames.map(async (_, frameIndex) => {
      const rgba = upscaleRgba(render(doc, frameIndex), doc.width, doc.height, scaleFactor);
      const idat = await deflateZlib(filterScanlines(rgba, outWidth, outHeight));
      return { idat, delayMs: doc.frameIntervalMs };
    }),
  );

  const bytes = buildApngBytes(outWidth, outHeight, frames);
  return new Blob([bytes], { type: "image/png" });
}

export async function exportApng(doc: DotDocument, suggestedName: string, scaleFactor = 1): Promise<void> {
  const name = suggestedName.endsWith(".png") ? suggestedName : `${suggestedName}.png`;
  const blob = await renderToApngBlob(doc, scaleFactor);

  if (supportsFileSystemAccess()) {
    const handle = await pickSaveHandle(name, APNG_PICKER_TYPES);
    if (!handle) return; // user cancelled
    await writeToHandle(handle, blob);
    return;
  }

  downloadBlob(blob, name);
}
