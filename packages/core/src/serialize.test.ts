import { describe, expect, it } from "vitest";
import { createDocument } from "./document";
import { deserialize, serialize } from "./serialize";
import { createTheme } from "./theme";

describe("serialize / deserialize", () => {
  it("round-trips a document, including pixel values", () => {
    const theme = createTheme("t", "T", ["#ff0000", "#00ff00"]);
    const doc = createDocument(3, 2, theme);
    doc.frames[0].set([0, 1, 2, 2, 1, 0]);

    const restored = deserialize(serialize(doc));

    expect(restored.width).toBe(3);
    expect(restored.height).toBe(2);
    expect([...restored.frames[0]]).toEqual([0, 1, 2, 2, 1, 0]);
    expect(restored.theme.colors).toEqual(theme.colors);
    expect(restored.theme.id).toBe("t");
  });

  it("round-trips multiple frames and the frame interval", () => {
    const theme = createTheme("t", "T", ["#ff0000"]);
    const doc = createDocument(2, 1, theme);
    doc.frames[0].set([0, 1]);
    doc.frames.push(new Uint8Array([1, 0]));
    doc.frameIntervalMs = 250;

    const restored = deserialize(serialize(doc));

    expect(restored.frames).toHaveLength(2);
    expect([...restored.frames[0]]).toEqual([0, 1]);
    expect([...restored.frames[1]]).toEqual([1, 0]);
    expect(restored.frameIntervalMs).toBe(250);
    expect(restored.activeFrameIndex).toBe(0);
  });

  it("rejects a file with an unsupported version", () => {
    const theme = createTheme("t", "T", []);
    const doc = createDocument(1, 1, theme);
    const file = JSON.parse(serialize(doc));
    file.version = 999;

    expect(() => deserialize(JSON.stringify(file))).toThrow();
  });

  it("migrates a v1 file (multiple themes + activeThemeId) to a single embedded theme", () => {
    const v1File = {
      version: 1,
      width: 2,
      height: 1,
      pixels: Buffer.from([0, 1]).toString("base64"),
      themes: [
        { id: "default", name: "Default", colors: ["#000000"] },
        { id: "alt", name: "Alt", colors: ["#ff0000"] },
      ],
      activeThemeId: "alt",
    };

    const restored = deserialize(JSON.stringify(v1File));

    expect(restored.theme.id).toBe("alt");
    expect([...restored.frames[0]]).toEqual([0, 1]);
  });

  it("migrates a v2 file (single pixel buffer) to a single-frame animation", () => {
    const v2File = {
      version: 2,
      width: 2,
      height: 1,
      pixels: Buffer.from([0, 1]).toString("base64"),
      theme: { id: "t", name: "T", colors: ["#000000", "#ff0000"] },
    };

    const restored = deserialize(JSON.stringify(v2File));

    expect(restored.frames).toHaveLength(1);
    expect([...restored.frames[0]]).toEqual([0, 1]);
    expect(restored.frameIntervalMs).toBeGreaterThan(0);
  });
});
