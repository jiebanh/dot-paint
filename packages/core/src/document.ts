import { HistoryManager } from "./history";
import { cloneTheme, type ColorHex, type Theme } from "./theme";

export const MAX_SIZE = 512;

export interface DotDocument {
  width: number;
  height: number;
  /** length width * height; values index into theme.colors. */
  pixels: Uint8Array;
  /**
   * A self-contained copy of the theme the document was created or last
   * "applied" with. Themes as reusable named presets live outside the
   * document (a theme library, e.g. packages/web/src/io/themeLibrary.ts);
   * applying one to a document just copies its colors in here, so a
   * .dpaint file stays renderable on its own without needing that library.
   */
  theme: Theme;
}

export function createDocument(width: number, height: number, theme: Theme): DotDocument {
  if (width < 1 || width > MAX_SIZE || height < 1 || height > MAX_SIZE) {
    throw new RangeError(`document size must be between 1 and ${MAX_SIZE}, got ${width}x${height}`);
  }
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    theme: cloneTheme(theme),
  };
}

export interface CellDiff {
  index: number;
  prevValue: number;
  newValue: number;
}

interface PixelEdit {
  type: "pixels";
  diffs: CellDiff[];
}

interface ThemeColorEdit {
  type: "themeColor";
  paletteIndex: number;
  prevColor: ColorHex;
  newColor: ColorHex;
}

interface ThemeApplied {
  type: "themeApplied";
  prevTheme: Theme;
  newTheme: Theme;
}

type HistoryEntry = PixelEdit | ThemeColorEdit | ThemeApplied;

/**
 * Mutable wrapper around a DotDocument. Framework-agnostic: web binds to it via
 * useSyncExternalStore, the VSCode extension host drives it directly.
 */
export class Document {
  private state: DotDocument;
  private listeners = new Set<() => void>();
  readonly history = new HistoryManager<HistoryEntry>();

  constructor(initial: DotDocument) {
    this.state = initial;
  }

  getState(): DotDocument {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Replaces the state container with a shallow clone and notifies listeners.
   * getState() must return a new reference on every real change: React's
   * useSyncExternalStore (see web's useDocument hook) decides whether to
   * re-render by comparing snapshot references, so mutating this.state in
   * place would make updates invisible until some unrelated re-render
   * happened to read the (already stale-looking but mutated) state fresh.
   */
  private commit(): void {
    this.state = { ...this.state };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  applyEdit(diffs: CellDiff[]): void {
    if (diffs.length === 0) return;
    for (const diff of diffs) this.state.pixels[diff.index] = diff.newValue;
    this.history.push({ type: "pixels", diffs });
    this.commit();
  }

  undo(): void {
    const entry = this.history.undo();
    if (!entry) return;
    this.applyHistoryEntry(entry, "undo");
    this.commit();
  }

  redo(): void {
    const entry = this.history.redo();
    if (!entry) return;
    this.applyHistoryEntry(entry, "redo");
    this.commit();
  }

  private applyHistoryEntry(entry: HistoryEntry, direction: "undo" | "redo"): void {
    if (entry.type === "pixels") {
      for (const diff of entry.diffs) {
        this.state.pixels[diff.index] = direction === "undo" ? diff.prevValue : diff.newValue;
      }
      return;
    }
    if (entry.type === "themeColor") {
      this.state.theme.colors[entry.paletteIndex] = direction === "undo" ? entry.prevColor : entry.newColor;
      return;
    }
    this.state.theme = direction === "undo" ? entry.prevTheme : entry.newTheme;
  }

  /** Copies a theme (e.g. from a theme library) into this document, replacing its current one. */
  applyTheme(theme: Theme): void {
    const prevTheme = this.state.theme;
    if (prevTheme.id === theme.id && colorsEqual(prevTheme.colors, theme.colors)) return;
    const newTheme = cloneTheme(theme);
    this.state.theme = newTheme;
    this.history.push({ type: "themeApplied", prevTheme, newTheme });
    this.commit();
  }

  setThemeColor(paletteIndex: number, color: ColorHex): void {
    const theme = this.state.theme;
    if (paletteIndex < 1 || paletteIndex >= theme.colors.length) {
      throw new RangeError(`paletteIndex ${paletteIndex} is out of range`);
    }
    const prevColor = theme.colors[paletteIndex];
    if (prevColor === color) return;
    theme.colors[paletteIndex] = color;
    this.history.push({ type: "themeColor", paletteIndex, prevColor, newColor: color });
    this.commit();
  }
}

function colorsEqual(a: ColorHex[], b: ColorHex[]): boolean {
  return a.length === b.length && a.every((color, i) => color === b[i]);
}
