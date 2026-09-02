import { describe, expect, it } from "vitest";
import { createTheme, PALETTE_SIZE, TRANSPARENT_INDEX } from "./theme";

describe("createTheme", () => {
  it("places user colors directly at their pixel index (index 1 = colors[0])", () => {
    const theme = createTheme("t", "Test", ["#111111", "#222222"]);
    expect(theme.colors).toHaveLength(PALETTE_SIZE);
    expect(theme.colors[1]).toBe("#111111");
    expect(theme.colors[2]).toBe("#222222");
  });

  it("reserves index 0 regardless of input", () => {
    const theme = createTheme("t", "Test", []);
    expect(theme.colors[TRANSPARENT_INDEX]).toBeDefined();
  });

  it("rejects more than 32 user colors", () => {
    const tooMany = Array.from({ length: 33 }, (_, i) => `#00000${i}`);
    expect(() => createTheme("t", "Test", tooMany)).toThrow(RangeError);
  });
});
