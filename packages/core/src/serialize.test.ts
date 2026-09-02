import { describe, expect, it } from "vitest";
import { createDocument } from "./document";
import { deserialize, serialize } from "./serialize";
import { createTheme } from "./theme";

describe("serialize / deserialize", () => {
  it("round-trips a document, including pixel values", () => {
    const theme = createTheme("t", "T", ["#ff0000", "#00ff00"]);
    const doc = createDocument(3, 2, [theme]);
    doc.pixels.set([0, 1, 2, 2, 1, 0]);

    const restored = deserialize(serialize(doc));

    expect(restored.width).toBe(3);
    expect(restored.height).toBe(2);
    expect([...restored.pixels]).toEqual([0, 1, 2, 2, 1, 0]);
    expect(restored.themes[0].colors).toEqual(theme.colors);
    expect(restored.activeThemeId).toBe("t");
  });

  it("rejects a file with an unsupported version", () => {
    const theme = createTheme("t", "T", []);
    const doc = createDocument(1, 1, [theme]);
    const file = JSON.parse(serialize(doc));
    file.version = 999;

    expect(() => deserialize(JSON.stringify(file))).toThrow();
  });
});
