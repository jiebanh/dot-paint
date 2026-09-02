import { describe, expect, it } from "vitest";
import { createDocument, Document, MAX_SIZE } from "./document";
import { createTheme } from "./theme";

function makeDoc(width = 4, height = 4) {
  const theme = createTheme("default", "Default", ["#ff0000", "#00ff00"]);
  return new Document(createDocument(width, height, [theme]));
}

describe("createDocument", () => {
  it("rejects sizes outside 1..MAX_SIZE", () => {
    const theme = createTheme("t", "T", []);
    expect(() => createDocument(0, 10, [theme])).toThrow(RangeError);
    expect(() => createDocument(MAX_SIZE + 1, 10, [theme])).toThrow(RangeError);
  });

  it("rejects an empty theme list", () => {
    expect(() => createDocument(4, 4, [])).toThrow();
  });
});

describe("Document", () => {
  it("applies edits and notifies subscribers", () => {
    const doc = makeDoc();
    let notified = 0;
    doc.subscribe(() => notified++);

    doc.applyEdit([{ index: 0, prevValue: 0, newValue: 1 }]);

    expect(doc.getState().pixels[0]).toBe(1);
    expect(notified).toBe(1);
  });

  it("undoes and redoes a whole stroke as one step", () => {
    const doc = makeDoc();
    doc.applyEdit([
      { index: 0, prevValue: 0, newValue: 1 },
      { index: 1, prevValue: 0, newValue: 1 },
    ]);

    doc.undo();
    expect([...doc.getState().pixels.slice(0, 2)]).toEqual([0, 0]);

    doc.redo();
    expect([...doc.getState().pixels.slice(0, 2)]).toEqual([1, 1]);
  });

  it("switching the active theme leaves pixel indices untouched", () => {
    const doc = makeDoc();
    const secondTheme = createTheme("alt", "Alt", ["#0000ff"]);
    doc.getState().themes.push(secondTheme);
    doc.applyEdit([{ index: 0, prevValue: 0, newValue: 1 }]);

    doc.setActiveTheme("alt");

    expect(doc.getState().activeThemeId).toBe("alt");
    expect(doc.getState().pixels[0]).toBe(1);
  });
});
