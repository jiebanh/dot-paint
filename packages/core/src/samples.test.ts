import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deserialize } from "./serialize";

/**
 * The repo's samples/ directory (issue #49) ships real, known-good .dpaint /
 * .dpaint-anim files for manual format/behavior checks. Loading them here
 * too means an accidental format-breaking change to deserialize() shows up
 * as a test failure, not just a surprise the next time someone opens them by
 * hand. Regenerate with `node samples/generate.mjs` if the format changes.
 */
const samplesDir = fileURLToPath(new URL("../../../samples/", import.meta.url));

function readSample(name: string): string {
  return readFileSync(`${samplesDir}${name}`, "utf-8");
}

describe("sample files", () => {
  it("heart.dpaint deserializes as a single-frame 16x16 document", () => {
    const doc = deserialize(readSample("heart.dpaint"));
    expect(doc.width).toBe(16);
    expect(doc.height).toBe(16);
    expect(doc.frames).toHaveLength(1);
    expect(doc.frames[0]).toHaveLength(16 * 16);
    expect(doc.frames[0].some((v) => v !== 0)).toBe(true); // isn't blank
  });

  it("bounce.dpaint-anim deserializes as a 6-frame 8x8 animation", () => {
    const doc = deserialize(readSample("bounce.dpaint-anim"));
    expect(doc.width).toBe(8);
    expect(doc.height).toBe(8);
    expect(doc.frames).toHaveLength(6);
    expect(doc.frameIntervalMs).toBe(120);
    for (const frame of doc.frames) {
      expect(frame).toHaveLength(8 * 8);
      expect(frame.some((v) => v !== 0)).toBe(true);
    }
  });
});
