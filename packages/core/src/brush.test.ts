import { describe, expect, it } from "vitest";
import { getBrushMask, Stroke } from "./brush";

describe("getBrushMask", () => {
  it("a size-1 square/circle is a single cell", () => {
    expect(getBrushMask("square", 1)).toEqual([{ dx: 0, dy: 0 }]);
    expect(getBrushMask("circle", 1)).toEqual([{ dx: 0, dy: 0 }]);
  });

  it("a square brush is denser than a circle brush of the same size", () => {
    const square = getBrushMask("square", 5);
    const circle = getBrushMask("circle", 5);
    expect(square.length).toBeGreaterThan(circle.length);
  });

  it("caches masks by (shape, size)", () => {
    expect(getBrushMask("circle", 3)).toBe(getBrushMask("circle", 3));
  });
});

describe("Stroke", () => {
  it("batches a whole drag into one diff per touched cell, keyed off the original value", () => {
    const pixels = new Uint8Array(9); // 3x3, all 0
    const stroke = new Stroke(pixels, 3, 3, "square", 1, 5);

    stroke.addPoint(0, 0);
    stroke.addPoint(1, 0); // revisits column edges but each cell's prevValue must stay 0
    const diffs = stroke.finish();

    expect(diffs.every((d) => d.prevValue === 0 && d.newValue === 5)).toBe(true);
    const indices = diffs.map((d) => d.index).sort((a, b) => a - b);
    expect(new Set(indices).size).toBe(indices.length); // no duplicate cells
  });

  it("produces no diff when painting the same color that's already there", () => {
    const pixels = new Uint8Array(9).fill(5);
    const stroke = new Stroke(pixels, 3, 3, "square", 1, 5);
    stroke.addPoint(1, 1);
    expect(stroke.finish()).toEqual([]);
  });
});
