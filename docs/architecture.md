# architecture

Design for the tool described in [direction.md](./direction.md). This document covers the
data model, package layout, and the web/VSCode integration strategy. It intentionally
scopes out anything not needed for the "core feature" list; "future development" items are
noted only where they constrain a decision made now.

For "where is constant X defined", see [constants.md](./constants.md) rather than grepping -
several are intentionally kept local to the logic that uses them rather than centralized.

## stack decisions

- Language: TypeScript everywhere.
- UI: React, shared between the web app and the VSCode webview.
- Repo: pnpm workspaces monorepo, three packages (`core`, `web`, `vscode-extension`).
- Web build: Vite. VSCode extension build: esbuild (standard for VSCode extensions).
- Core build: `tsup`, emitting ESM + type declarations, consumed by both `web` (Vite) and
  `vscode-extension` (Node/esbuild).
- Testing: Vitest for `core` (pure logic — brushes, rendering, serialization).

```
dot-paint/
  pnpm-workspace.yaml
  packages/
    core/               @dot-paint/core — framework-agnostic engine
    web/                @dot-paint/web — React SPA
    vscode-extension/   @dot-paint/vscode-extension — custom editor
  docs/
```

## data model (`packages/core`)

Pixels store a **palette index**, not a color. This is the key structural choice: it's what
makes "edit a color -> matching dots repaint" and "apply a theme -> all dots repaint" both
fall out of the same mechanism (re-resolve index -> color) instead of needing two.

```ts
type PixelIndex = number;        // 0 = transparent, always
type ColorHex = string;          // "#rrggbb"

const PALETTE_SIZE = 17;         // index 0 (transparent) + 16 user colors, at creation time

interface Theme {
  id: string;
  name: string;
  colors: ColorHex[];            // length PALETTE_SIZE; colors[i] is the color for pixel
                                  // index i. colors[0] is never rendered (index 0 is
                                  // always transparent) — kept only so pixel index maps
                                  // directly to array index with no off-by-one.
}

interface DotDocument {
  width: number;                 // <= 512
  height: number;                // <= 512
  frames: Uint8Array[];          // one or more frames; each length = width * height, values index into theme.colors
  activeFrameIndex: number;      // which frame is shown/edited; not persisted (files always reopen on frame 0)
  frameIntervalMs: number;       // playback speed, one global rate shared by all frames
  theme: Theme;                  // a self-contained copy — see "themes vs. the theme library" below
}
```

- Index `0` is reserved and always renders as transparent — it is not stored per-theme, so
  it can't drift when the theme changes. `colors[0]`'s content is irrelevant (the renderer
  short-circuits on index 0 before ever reading it); it exists only so every other lookup is
  a direct `colors[pixelIndex]` with no `-1` offset to get wrong.
- 16 is the palette size a new theme starts with (`colors[1..16]`, plus a fixed transparent
  swatch for index 0) — not a hard ceiling. `Document.addThemeColor()` appends further slots
  on request, up to `MAX_PALETTE_SIZE` (64, in `document.ts`); the palette editor UI's own
  "+" button is the usual way to reach that.
- "The color palette" the user paints with **is** `document.theme.colors`. Editing a swatch
  mutates that array in place; every pixel holding that index re-resolves to the new color
  on next render. No separate palette-vs-theme sync needed.
- `Uint8Array` caps the palette at 256 colors (indices 0–255) - well above `MAX_PALETTE_SIZE`
  (64), so the pixel type doesn't need revisiting even if that ceiling is raised later. Pixel
  buffer stays small at 512×512 (256 KB max) either way.

### animation (issue #35)

A document is always an animation, even when it only has one frame — there is no separate
"static image" type. `Document.applyEdit()` writes into `frames[activeFrameIndex]`; every
other operation (undo/redo, render, flood fill, brush strokes) is frame-agnostic and just
takes whichever `Uint8Array` it's handed, so none of that code needed to change.

- `Document` exposes `setActiveFrame`, `addFrame(copyCurrent?)`, `removeFrame()`,
  `moveFrame("left" | "right")`, and `setFrameInterval(ms)` — all undoable except
  `setActiveFrame` (navigation, not an edit). Frame count is capped at `MAX_FRAMES` (256),
  mirroring `MAX_PALETTE_SIZE`'s role for the palette.
- `render(doc, frameIndex?)` takes an explicit frame index (defaulting to
  `doc.activeFrameIndex`) rather than always rendering "the" frame — this is what lets
  `packages/web/src/components/FrameStrip.tsx` draw a thumbnail per frame without disturbing
  which one is actively being edited, and is the seam future per-frame export would use.
- File format bumped to **v3**: `pixels: string` became `frames: string[]`, plus
  `frameIntervalMs`. `activeFrameIndex` is not persisted. `deserialize()` migrates v1 and v2
  files by wrapping their single pixel buffer into a one-element `frames` array.
- **Deferred**: APNG (and other multi-frame) export/import, and a dedicated animation file
  extension, were scoped out of the first pass — implementing an APNG encoder from scratch
  (no browser or `pngjs` support for the `acTL`/`fcTL`/`fdAT` chunks) is a substantial,
  separable piece of work. Tracked as a follow-up once frame editing itself is validated.

### themes vs. the theme library

A document holds exactly **one** `Theme`, embedded and self-contained — a `.dpaint` file
renders correctly on its own, with nothing external to resolve. Reusable named presets
("themes" in the everyday sense — "Night", "Pastel", ...) live in a separate **theme
library**, outside any document (`packages/web/src/io/themeLibrary.ts`, `localStorage`-backed
today). `Document.applyTheme(theme)` copies a library entry's colors into the document,
replacing its current theme wholesale; `pixels` is untouched, so every dot re-resolves to
the new theme's colors. Like a pixel edit or a palette color change, this goes through
`history` and is undoable.

This split (document owns one concrete theme; the library owns reusable presets) is what
lets themes be shared *across* documents without documents needing to reference each other
or a shared file.

### document mutation & undo

`Document` is a plain class (no framework dependency) exposing:

- `subscribe(listener)` / notify-on-change, so `web`'s React layer can bind via
  `useSyncExternalStore` without pulling in a state library (Redux/Zustand aren't needed —
  keeping `core` UI-framework-agnostic matters because `vscode-extension`'s webview reuses
  the same `web` bundle).
- `applyEdit(cellDiffs: {index, prevValue, newValue}[])` — the only mutation path. Every
  brush stroke, palette edit, or resize produces a diff list, not a full-buffer snapshot.
- `HistoryManager` holds a stack of these diff lists for undo/redo. At 512×512 a full
  snapshot is only 256 KB, but diffs are still preferable: most edits touch a handful of
  cells, and diffs are what a future collaborative/animation-frame model would need anyway.
- A full drag stroke (mousedown -> mouseup) batches into one diff list / one undo step, not
  one per stamped cell.

### brushes

`BrushEngine` precomputes a cell-offset mask per `(shape, size)` pair (`circle` | `square`,
integer radius) — cheap to cache since size is bounded and changes infrequently. Painting a
stroke:

1. Bresenham-interpolate the pointer path between the last and current position (so fast
   drags don't leave gaps).
2. Stamp the cached mask at each interpolated point, deduping into a single `Map<index,
   newValue>` for the stroke.
3. Flush as one `applyEdit` on pointer-up.

### rendering

`render(doc: DotDocument): Uint8ClampedArray` is a pure function: index buffer + active
theme -> RGBA buffer (`width * height * 4` bytes, straight lookup, index 0 -> `[0,0,0,0]`).
No DOM, no canvas — it runs identically in a browser webview or the Node extension host.
This is also the seam the "webassembly efficiation" future item hooks into: swapping this
function for a WASM implementation later doesn't change its callers.

- **web**: `ImageData` wraps the buffer directly, `putImageData` onto a `<canvas>` with
  `image-rendering: pixelated`, scaled by a zoom factor for editing.
- **PNG export**: the browser has a built-in encoder, so `web` just draws to an offscreen
  canvas and calls `canvas.toBlob('image/png')` — no custom encoder needed there. The
  VSCode extension host has no DOM/canvas, so `vscode-extension` runs `core`'s `render()`
  and feeds the buffer to `pngjs` (a Node dependency of that package only) to encode, then
  writes via `vscode.workspace.fs.writeFile`. `core` itself stays free of a PNG dependency.

### serialization

Project file extension: **`.dpaint`** (JSON body). Chosen over reusing `.json` so VSCode's
custom editor can claim the extension via `contributes.customEditors` without hijacking
generic JSON files.

```json
{
  "version": 2,
  "width": 32,
  "height": 32,
  "pixels": "<base64 of the Uint8Array>",
  "theme": { "id": "default", "name": "Default", "colors": ["#000000", "#ffffff"] }
}
```

`version` guards migrations: v1 files (multiple `themes` + `activeThemeId`, from before the
theme library split) are migrated on read by taking the theme that was active and discarding
the rest — `core`'s `deserialize` does this transparently, so `web` and `vscode-extension`
never see the old shape. Both packages call into `core`'s `serialize`/`deserialize` rather
than each implementing (de)serialization.

## packages/web

React SPA (Vite). Structure:

```
src/
  components/   Canvas, Toolbar, PaletteEditor, ThemeLibraryPanel, BrushSizeControl
  hooks/        useDocument (useSyncExternalStore over core Document)
  io/           file open/save (File System Access API, with download-fallback for
                browsers that lack it), PNG export
  App.tsx, main.tsx
```

Runs standalone (open a `.dpaint` file via the File System Access API / drag-and-drop) and
is also the bundle embedded in the VSCode webview — see below.

Auto-save (the local IndexedDB safety net and its restore UI, web-only) is documented
separately in [autosave.md](./autosave.md).

## packages/vscode-extension

Implements `vscode.CustomEditorProvider<DotPaintDocument>` as a **custom binary editor** for
`.dpaint` files:

- `dotPaintDocument.ts` — wraps a `core.DotDocument`; `openCustomDocument` reads bytes via
  `vscode.workspace.fs.readFile` and calls `core.deserialize`; `saveCustomDocument` reverses
  that.
- `dotPaintEditorProvider.ts` — on `resolveCustomEditor`, creates a webview, points it at
  the **same built `web` bundle** (via `webview.asWebviewUri`), and bridges
  `postMessage`/`onDidReceiveMessage` between the extension host and the webview for: load
  document, apply edit (so undo/redo and dirty-state integrate with VS Code's own save UI),
  and "export PNG" requests (handled host-side per the PNG note above, since that's where
  `pngjs` and filesystem access live).
- The extension manifest (`package.json`) declares `contributes.customEditors` for
  `.dpaint`.

Because `core` has no DOM dependency, the identical document/history/brush/render logic
executes in both the browser webview and, for PNG export, directly in the Node extension
host — there's no fork between "web logic" and "extension logic," only where each step runs.

## sizing & constraints recap

- Canvas: up to 512×512, indexed pixel buffer -> 256 KB worst case, PNG output 512×512 RGBA.
- Palette: a new theme starts with 16 user colors (indices 1–16) + reserved transparent
  (index 0) = 17 slots, growable up to 64 via `Document.addThemeColor()` - well within the
  `Uint8Array` index range (0–255).
- Brushes: circle/square, adjustable integer size, precomputed offset masks.
- Animation: 1 frame at creation, growable up to `MAX_FRAMES` (256); interval clamped to
  `MIN_FRAME_INTERVAL_MS`–`MAX_FRAME_INTERVAL_MS` (20–10000ms).

## deferred (not designed now, flagged so today's choices don't block them)

- **Keyboard-only manipulation**: current design already routes all edits through
  `applyEdit`, so a keyboard-driven cursor + "stamp here" command reuses the same path as
  pointer input — no rework anticipated.
- **Animation export/import**: frame editing itself is implemented (see "animation" above) -
  still deferred is APNG (and other multi-frame format) export/import and a dedicated
  animation file extension, since a from-scratch APNG encoder is a substantial separate task.
- **WebAssembly**: the `render()` seam noted above is the intended replacement point; no
  other function is designed with this in mind yet.
