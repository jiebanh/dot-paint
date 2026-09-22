import { describe, expect, it } from "vitest";
import { floodFill } from "./fill";

function grid(rows: number[][]): Uint8Array {
  const width = rows[0].length;
  const pixels = new Uint8Array(width * rows.length);
  rows.forEach((row, y) => row.forEach((v, x) => (pixels[y * width + x] = v)));
  return pixels;
}

describe("floodFill", () => {
  it("fills only the 4-connected region of matching color", () => {
    // 0 0 1
    // 0 0 1
    // 1 1 1
    const pixels = grid([
      [0, 0, 1],
      [0, 0, 1],
      [1, 1, 1],
    ]);

    const diffs = floodFill(pixels, 3, 3, 0, 0, 5);

    const filledIndices = diffs.map((d) => d.index).sort((a, b) => a - b);
    expect(filledIndices).toEqual([0, 1, 3, 4]); // the 2x2 block of 0s, not the 1s
    expect(diffs.every((d) => d.prevValue === 0 && d.newValue === 5)).toBe(true);
  });

  it("does not cross diagonally - only orthogonal neighbors count", () => {
    // 0 1
    // 1 0
    const pixels = grid([
      [0, 1],
      [1, 0],
    ]);

    const diffs = floodFill(pixels, 2, 2, 0, 0, 9);

    expect(diffs.map((d) => d.index)).toEqual([0]); // just the starting cell
  });

  it("returns no diffs when filling with the color that's already there", () => {
    const pixels = grid([[3, 3, 3]]);
    expect(floodFill(pixels, 3, 1, 1, 0, 3)).toEqual([]);
  });

  it("returns no diffs for an out-of-bounds start point", () => {
    const pixels = grid([[0, 0]]);
    expect(floodFill(pixels, 2, 1, -1, 0, 5)).toEqual([]);
    expect(floodFill(pixels, 2, 1, 2, 0, 5)).toEqual([]);
  });

  it("fills an entire uniform canvas in one call", () => {
    const pixels = new Uint8Array(16 * 16); // all zeros
    const diffs = floodFill(pixels, 16, 16, 8, 8, 7);
    expect(diffs).toHaveLength(256);
  });
});
