import { HistoryManager } from "./history";
import type { ColorHex, Theme } from "./theme";

export const MAX_SIZE = 512;

export interface DotDocument {
  width: number;
  height: number;
  /** length width * height; values index into the active theme's colors. */
  pixels: Uint8Array;
  themes: Theme[];
  activeThemeId: string;
}

export function createDocument(width: number, height: number, themes: Theme[], activeThemeId?: string): DotDocument {
  if (width < 1 || width > MAX_SIZE || height < 1 || height > MAX_SIZE) {
    throw new RangeError(`document size must be between 1 and ${MAX_SIZE}, got ${width}x${height}`);
  }
  if (themes.length === 0) {
    throw new Error("a document needs at least one theme");
  }
  const resolvedActiveThemeId = activeThemeId ?? themes[0].id;
  if (!themes.some((theme) => theme.id === resolvedActiveThemeId)) {
    throw new Error(`activeThemeId "${resolvedActiveThemeId}" is not among the provided themes`);
  }
  return {
    width,
    height,
    pixels: new Uint8Array(width * height),
    themes,
    activeThemeId: resolvedActiveThemeId,
  };
}

export function getActiveTheme(doc: DotDocument): Theme {
  const theme = doc.themes.find((t) => t.id === doc.activeThemeId);
  if (!theme) throw new Error(`active theme "${doc.activeThemeId}" not found`);
  return theme;
}

export interface CellDiff {
  index: number;
  prevValue: number;
  newValue: number;
}

/**
 * Mutable wrapper around a DotDocument. Framework-agnostic: web binds to it via
 * useSyncExternalStore, the VSCode extension host drives it directly.
 */
export class Document {
  private state: DotDocument;
  private listeners = new Set<() => void>();
  readonly history = new HistoryManager<CellDiff[]>();

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
    this.history.push(diffs);
    this.commit();
  }

  undo(): void {
    const diffs = this.history.undo();
    if (!diffs) return;
    for (const diff of diffs) this.state.pixels[diff.index] = diff.prevValue;
    this.commit();
  }

  redo(): void {
    const diffs = this.history.redo();
    if (!diffs) return;
    for (const diff of diffs) this.state.pixels[diff.index] = diff.newValue;
    this.commit();
  }

  setActiveTheme(themeId: string): void {
    if (!this.state.themes.some((theme) => theme.id === themeId)) {
      throw new Error(`unknown theme "${themeId}"`);
    }
    this.state.activeThemeId = themeId;
    this.commit();
  }

  setThemeColor(themeId: string, paletteIndex: number, color: ColorHex): void {
    const theme = this.state.themes.find((t) => t.id === themeId);
    if (!theme) throw new Error(`unknown theme "${themeId}"`);
    if (paletteIndex < 1 || paletteIndex >= theme.colors.length) {
      throw new RangeError(`paletteIndex ${paletteIndex} is out of range`);
    }
    theme.colors[paletteIndex] = color;
    this.commit();
  }
}
