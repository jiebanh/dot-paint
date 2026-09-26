import { HistoryManager } from "./history";
import { cloneTheme, type ColorHex, type Theme } from "./theme";

export const MAX_SIZE = 512;

/** A theme's colors array can grow up to this many entries (including the reserved transparent slot 0). */
export const MAX_PALETTE_SIZE = 64;

/** Upper bound on how many frames an animation can hold, mainly to cap memory (each frame is width*height bytes). */
export const MAX_FRAMES = 256;

export const DEFAULT_FRAME_INTERVAL_MS = 100;
export const MIN_FRAME_INTERVAL_MS = 20;
export const MAX_FRAME_INTERVAL_MS = 10000;

export interface DotDocument {
  width: number;
  height: number;
  /**
   * One or more frames, each of length width * height with values indexing
   * into theme.colors. A single-frame document is just an animation with one
   * frame - there is no separate "static image" type.
   */
  frames: Uint8Array[];
  /** Which frame is currently shown/edited. Not persisted by serialize() - files always reopen on frame 0. */
  activeFrameIndex: number;
  /** Milliseconds each frame is shown for during playback. One global rate for now, not per-frame. */
  frameIntervalMs: number;
  /**
   * A self-contained copy of the theme the document was created or last
   * "applied" with. Themes as reusable named presets live outside the
   * document (a theme library, e.g. packages/web/src/io/themeLibrary.ts);
   * applying one to a document just copies its colors in here, so a
   * .dpaint file stays renderable on its own without needing that library.
   */
  theme: Theme;
}

export function createDocument(width: number, height: number, theme: Theme, frameCount = 1): DotDocument {
  if (width < 1 || width > MAX_SIZE || height < 1 || height > MAX_SIZE) {
    throw new RangeError(`document size must be between 1 and ${MAX_SIZE}, got ${width}x${height}`);
  }
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > MAX_FRAMES) {
    throw new RangeError(`frameCount must be an integer between 1 and ${MAX_FRAMES}, got ${frameCount}`);
  }
  return {
    width,
    height,
    frames: Array.from({ length: frameCount }, () => new Uint8Array(width * height)),
    activeFrameIndex: 0,
    frameIntervalMs: DEFAULT_FRAME_INTERVAL_MS,
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
  frameIndex: number;
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

interface ThemeColorAdded {
  type: "themeColorAdded";
  color: ColorHex;
}

interface FrameInserted {
  type: "frameInserted";
  index: number;
  pixels: Uint8Array;
  prevActiveFrameIndex: number;
}

interface FrameRemoved {
  type: "frameRemoved";
  index: number;
  pixels: Uint8Array;
  prevActiveFrameIndex: number;
  newActiveFrameIndex: number;
}

interface FrameMoved {
  type: "frameMoved";
  fromIndex: number;
  toIndex: number;
}

interface FrameIntervalChanged {
  type: "frameIntervalChanged";
  prevMs: number;
  newMs: number;
}

type HistoryEntry =
  | PixelEdit
  | ThemeColorEdit
  | ThemeApplied
  | ThemeColorAdded
  | FrameInserted
  | FrameRemoved
  | FrameMoved
  | FrameIntervalChanged;

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
    const frameIndex = this.state.activeFrameIndex;
    const frame = this.state.frames[frameIndex];
    for (const diff of diffs) frame[diff.index] = diff.newValue;
    this.history.push({ type: "pixels", frameIndex, diffs });
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
      const frame = this.state.frames[entry.frameIndex];
      for (const diff of entry.diffs) {
        frame[diff.index] = direction === "undo" ? diff.prevValue : diff.newValue;
      }
      return;
    }
    if (entry.type === "themeColor") {
      this.state.theme.colors[entry.paletteIndex] = direction === "undo" ? entry.prevColor : entry.newColor;
      return;
    }
    if (entry.type === "themeColorAdded") {
      if (direction === "undo") this.state.theme.colors.pop();
      else this.state.theme.colors.push(entry.color);
      return;
    }
    if (entry.type === "themeApplied") {
      this.state.theme = direction === "undo" ? entry.prevTheme : entry.newTheme;
      return;
    }
    if (entry.type === "frameInserted") {
      if (direction === "undo") {
        this.state.frames.splice(entry.index, 1);
        this.state.activeFrameIndex = entry.prevActiveFrameIndex;
      } else {
        this.state.frames.splice(entry.index, 0, entry.pixels);
        this.state.activeFrameIndex = entry.index;
      }
      return;
    }
    if (entry.type === "frameRemoved") {
      if (direction === "undo") {
        this.state.frames.splice(entry.index, 0, entry.pixels);
        this.state.activeFrameIndex = entry.prevActiveFrameIndex;
      } else {
        this.state.frames.splice(entry.index, 1);
        this.state.activeFrameIndex = entry.newActiveFrameIndex;
      }
      return;
    }
    if (entry.type === "frameMoved") {
      if (direction === "undo") {
        moveArrayItem(this.state.frames, entry.toIndex, entry.fromIndex);
        this.state.activeFrameIndex = entry.fromIndex;
      } else {
        moveArrayItem(this.state.frames, entry.fromIndex, entry.toIndex);
        this.state.activeFrameIndex = entry.toIndex;
      }
      return;
    }
    this.state.frameIntervalMs = direction === "undo" ? entry.prevMs : entry.newMs;
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

  /** Appends a new slot to the current theme's palette. The new index is `getState().theme.colors.length - 1` right after this returns. */
  addThemeColor(color: ColorHex = "#000000"): void {
    if (this.state.theme.colors.length >= MAX_PALETTE_SIZE) {
      throw new RangeError(`a theme cannot have more than ${MAX_PALETTE_SIZE} colors`);
    }
    this.state.theme.colors.push(color);
    this.history.push({ type: "themeColorAdded", color });
    this.commit();
  }

  /** Makes an existing frame the active (shown/edited) one. */
  setActiveFrame(index: number): void {
    if (index < 0 || index >= this.state.frames.length) {
      throw new RangeError(`frame index ${index} is out of range`);
    }
    if (index === this.state.activeFrameIndex) return;
    this.state.activeFrameIndex = index;
    this.commit();
  }

  /** Inserts a new frame right after the active one (blank, or a copy of it) and makes it active. */
  addFrame(copyCurrent = false): void {
    if (this.state.frames.length >= MAX_FRAMES) {
      throw new RangeError(`an animation cannot have more than ${MAX_FRAMES} frames`);
    }
    const prevActiveFrameIndex = this.state.activeFrameIndex;
    const index = prevActiveFrameIndex + 1;
    const pixels = copyCurrent
      ? Uint8Array.from(this.state.frames[prevActiveFrameIndex])
      : new Uint8Array(this.state.width * this.state.height);
    this.state.frames.splice(index, 0, pixels);
    this.state.activeFrameIndex = index;
    this.history.push({ type: "frameInserted", index, pixels, prevActiveFrameIndex });
    this.commit();
  }

  /** Removes the active frame. Throws if it's the only one left. */
  removeFrame(): void {
    if (this.state.frames.length <= 1) {
      throw new RangeError("an animation must have at least one frame");
    }
    const index = this.state.activeFrameIndex;
    const pixels = this.state.frames[index];
    this.state.frames.splice(index, 1);
    const newActiveFrameIndex = Math.min(index, this.state.frames.length - 1);
    this.state.activeFrameIndex = newActiveFrameIndex;
    this.history.push({ type: "frameRemoved", index, pixels, prevActiveFrameIndex: index, newActiveFrameIndex });
    this.commit();
  }

  /** Swaps the active frame with its left/right neighbor. No-op at either edge. */
  moveFrame(direction: "left" | "right"): void {
    const fromIndex = this.state.activeFrameIndex;
    const toIndex = direction === "left" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= this.state.frames.length) return;
    moveArrayItem(this.state.frames, fromIndex, toIndex);
    this.state.activeFrameIndex = toIndex;
    this.history.push({ type: "frameMoved", fromIndex, toIndex });
    this.commit();
  }

  setFrameInterval(ms: number): void {
    if (ms < MIN_FRAME_INTERVAL_MS || ms > MAX_FRAME_INTERVAL_MS) {
      throw new RangeError(`frame interval must be between ${MIN_FRAME_INTERVAL_MS} and ${MAX_FRAME_INTERVAL_MS}ms`);
    }
    const prevMs = this.state.frameIntervalMs;
    if (prevMs === ms) return;
    this.state.frameIntervalMs = ms;
    this.history.push({ type: "frameIntervalChanged", prevMs, newMs: ms });
    this.commit();
  }
}

function colorsEqual(a: ColorHex[], b: ColorHex[]): boolean {
  return a.length === b.length && a.every((color, i) => color === b[i]);
}

function moveArrayItem<T>(arr: T[], fromIndex: number, toIndex: number): void {
  const [item] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item);
}
