/**
 * Nearest-neighbor upscale of an RGBA buffer by an integer factor: each pixel
 * becomes a factor x factor block of identical pixels, so dot edges stay
 * crisp. Pure and DOM-free, shared by both packages/web (PNG export) and
 * packages/vscode-extension (pngjs has no scaling of its own) so the two
 * produce pixel-identical output for the same input (the encoded PNG bytes
 * can still differ - the browser and pngjs use different PNG encoders).
 */
export function upscaleRgba(
  rgba: Uint8ClampedArray<ArrayBuffer>,
  width: number,
  height: number,
  factor: number,
): Uint8ClampedArray<ArrayBuffer> {
  if (factor < 1 || !Number.isInteger(factor)) {
    throw new RangeError(`upscale factor must be a positive integer, got ${factor}`);
  }
  if (factor === 1) return rgba;

  const outWidth = width * factor;
  const outHeight = height * factor;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const r = rgba[srcOffset];
      const g = rgba[srcOffset + 1];
      const b = rgba[srcOffset + 2];
      const a = rgba[srcOffset + 3];

      for (let dy = 0; dy < factor; dy++) {
        const outRowStart = ((y * factor + dy) * outWidth + x * factor) * 4;
        for (let dx = 0; dx < factor; dx++) {
          const outOffset = outRowStart + dx * 4;
          out[outOffset] = r;
          out[outOffset + 1] = g;
          out[outOffset + 2] = b;
          out[outOffset + 3] = a;
        }
      }
    }
  }

  return out;
}
