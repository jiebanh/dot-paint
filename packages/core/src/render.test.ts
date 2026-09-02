import { describe, expect, it } from "vitest";
import { createDocument } from "./document";
import { render } from "./render";
import { createTheme } from "./theme";

describe("render", () => {
  it("renders index 0 as fully transparent regardless of theme content", () => {
    const theme = createTheme("t", "T", ["#ff0000"]);
    const doc = createDocument(1, 1, [theme]);

    const rgba = render(doc);

    expect([...rgba]).toEqual([0, 0, 0, 0]);
  });

  it("resolves a non-zero index through the active theme's colors", () => {
    const theme = createTheme("t", "T", ["#ff0000"]);
    const doc = createDocument(1, 1, [theme]);
    doc.pixels[0] = 1;

    const rgba = render(doc);

    expect([...rgba]).toEqual([255, 0, 0, 255]);
  });

  it("re-resolves the same index to a different color after a theme switch", () => {
    const themeA = createTheme("a", "A", ["#ff0000"]);
    const themeB = createTheme("b", "B", ["#00ff00"]);
    const doc = createDocument(1, 1, [themeA, themeB]);
    doc.pixels[0] = 1;

    expect([...render(doc)]).toEqual([255, 0, 0, 255]);

    doc.activeThemeId = "b";
    expect([...render(doc)]).toEqual([0, 255, 0, 255]);
  });
});
