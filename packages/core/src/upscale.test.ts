import { describe, expect, it } from "vitest";
import { upscaleRgba } from "./upscale";

describe("upscaleRgba", () => {
  it("returns the same buffer unchanged at factor 1", () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
    expect(upscaleRgba(rgba, 1, 1, 1)).toBe(rgba);
  });

  it("replicates each pixel into a factor x factor block", () => {
    // 2x1 image: red, blue
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);

    const out = upscaleRgba(rgba, 2, 1, 3);

    expect(out).toHaveLength(2 * 3 * 1 * 3 * 4); // (2*3) x (1*3) x 4 channels
    // sample every pixel of the 6x3 output and check it matches the expected source pixel
    const outWidth = 6;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) {
        const o = (y * outWidth + x) * 4;
        const expected = x < 3 ? [255, 0, 0, 255] : [0, 0, 255, 255];
        expect([out[o], out[o + 1], out[o + 2], out[o + 3]]).toEqual(expected);
      }
    }
  });

  it("rejects a non-integer or non-positive factor", () => {
    const rgba = new Uint8ClampedArray(4);
    expect(() => upscaleRgba(rgba, 1, 1, 0)).toThrow(RangeError);
    expect(() => upscaleRgba(rgba, 1, 1, 1.5)).toThrow(RangeError);
  });
});
