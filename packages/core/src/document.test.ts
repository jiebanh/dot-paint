import { describe, expect, it } from "vitest";
import { createDocument, Document, MAX_PALETTE_SIZE, MAX_SIZE } from "./document";
import { createTheme } from "./theme";

function makeDoc(width = 4, height = 4) {
  const theme = createTheme("default", "Default", ["#ff0000", "#00ff00"]);
  return new Document(createDocument(width, height, theme));
}

describe("createDocument", () => {
  it("rejects sizes outside 1..MAX_SIZE", () => {
    const theme = createTheme("t", "T", []);
    expect(() => createDocument(0, 10, theme)).toThrow(RangeError);
    expect(() => createDocument(MAX_SIZE + 1, 10, theme)).toThrow(RangeError);
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

  it("returns a new getState() reference on every mutation, so useSyncExternalStore-style consumers can detect the change", () => {
    const doc = makeDoc();
    const altTheme = createTheme("alt", "Alt", ["#0000ff"]);

    const beforeEdit = doc.getState();
    doc.applyEdit([{ index: 0, prevValue: 0, newValue: 1 }]);
    expect(doc.getState()).not.toBe(beforeEdit);

    const beforeUndo = doc.getState();
    doc.undo();
    expect(doc.getState()).not.toBe(beforeUndo);

    const beforeRedo = doc.getState();
    doc.redo();
    expect(doc.getState()).not.toBe(beforeRedo);

    const beforeApply = doc.getState();
    doc.applyTheme(altTheme);
    expect(doc.getState()).not.toBe(beforeApply);

    const beforeColor = doc.getState();
    doc.setThemeColor(1, "#123456");
    expect(doc.getState()).not.toBe(beforeColor);
  });

  it("undoes and redoes a theme color change", () => {
    const doc = makeDoc();

    doc.setThemeColor(1, "#123456");
    expect(doc.getState().theme.colors[1]).toBe("#123456");

    doc.undo();
    expect(doc.getState().theme.colors[1]).toBe("#ff0000");

    doc.redo();
    expect(doc.getState().theme.colors[1]).toBe("#123456");
  });

  it("does not record a color set that doesn't actually change the color", () => {
    const doc = makeDoc();

    doc.setThemeColor(1, "#ff0000"); // already the current color
    expect(doc.history.canUndo).toBe(false);
  });

  it("interleaves pixel edits and color edits in a single undo stack", () => {
    const doc = makeDoc();

    doc.applyEdit([{ index: 0, prevValue: 0, newValue: 1 }]);
    doc.setThemeColor(1, "#123456");

    doc.undo(); // undoes the color change first
    expect(doc.getState().theme.colors[1]).toBe("#ff0000");
    expect(doc.getState().pixels[0]).toBe(1);

    doc.undo(); // then the pixel edit
    expect(doc.getState().pixels[0]).toBe(0);
  });

  it("applies a whole theme, leaving pixel indices untouched, and can undo/redo it", () => {
    const doc = makeDoc();
    const altTheme = createTheme("alt", "Alt", ["#0000ff"]);
    doc.applyEdit([{ index: 0, prevValue: 0, newValue: 1 }]);

    doc.applyTheme(altTheme);
    expect(doc.getState().theme.id).toBe("alt");
    expect(doc.getState().pixels[0]).toBe(1);

    doc.undo();
    expect(doc.getState().theme.id).toBe("default");

    doc.redo();
    expect(doc.getState().theme.id).toBe("alt");
  });

  it("does not record applying the theme that's already active", () => {
    const doc = makeDoc();
    const sameTheme = createTheme("default", "Default", ["#ff0000", "#00ff00"]);

    doc.applyTheme(sameTheme);

    expect(doc.history.canUndo).toBe(false);
  });

  it("never mutates the Theme objects it was constructed or applied with, so a shared preset (e.g. a built-in theme) can't be corrupted by editing one document's colors", () => {
    const sourceTheme = createTheme("shared", "Shared", ["#ff0000"]);
    const doc = new Document(createDocument(2, 2, sourceTheme));

    doc.setThemeColor(1, "#123456");
    expect(sourceTheme.colors[1]).toBe("#ff0000");

    const libraryTheme = createTheme("library", "Library", ["#00ff00"]);
    doc.applyTheme(libraryTheme);
    doc.setThemeColor(1, "#654321");
    expect(libraryTheme.colors[1]).toBe("#00ff00");
  });

  it("appends a new palette slot and can undo/redo it", () => {
    const doc = makeDoc();
    const before = doc.getState().theme.colors.length;

    doc.addThemeColor("#123456");
    expect(doc.getState().theme.colors).toHaveLength(before + 1);
    expect(doc.getState().theme.colors[before]).toBe("#123456");

    doc.undo();
    expect(doc.getState().theme.colors).toHaveLength(before);

    doc.redo();
    expect(doc.getState().theme.colors).toHaveLength(before + 1);
    expect(doc.getState().theme.colors[before]).toBe("#123456");
  });

  it("refuses to grow the palette past MAX_PALETTE_SIZE", () => {
    const doc = makeDoc();
    while (doc.getState().theme.colors.length < MAX_PALETTE_SIZE) {
      doc.addThemeColor();
    }
    expect(() => doc.addThemeColor()).toThrow(RangeError);
    expect(doc.getState().theme.colors).toHaveLength(MAX_PALETTE_SIZE);
  });
});
