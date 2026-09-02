# architecture

Design for the tool described in [direction.md](./direction.md). This document covers the
data model, package layout, and the web/VSCode integration strategy. It intentionally
scopes out anything not needed for the "core feature" list; "future development" items are
noted only where they constrain a decision made now.

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
makes "edit a color -> matching dots repaint" and "switch theme -> all dots repaint" both
fall out of the same mechanism (re-resolve index -> color) instead of needing two.

```ts
type PixelIndex = number;        // 0 = transparent, always, across every theme
type ColorHex = string;          // "#rrggbb"

const PALETTE_SIZE = 33;         // index 0 (transparent) + 32 user colors

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
  pixels: Uint8Array;            // length = width * height, values index into the active theme
  themes: Theme[];
  activeThemeId: string;
}
```

- Index `0` is reserved and always renders as transparent, regardless of theme — it is not
  stored per-theme, so it can't drift between themes. `colors[0]`'s content is irrelevant
  (the renderer short-circuits on index 0 before ever reading it); it exists only so every
  other lookup is a direct `colors[pixelIndex]` with no `-1` offset to get wrong.
- 32 is the palette size the UI is designed around (a 32-swatch grid, `colors[1..32]`, plus
  a fixed transparent swatch for index 0) — not a hard ceiling in the data model.
- "The color palette" the user paints with **is** `themes[activeThemeId].colors`. Editing a
  swatch mutates that theme's `colors` array in place; every pixel holding that index
  re-resolves to the new color on next render. No separate palette-vs-theme sync needed.
- Switching the active theme swaps `activeThemeId`; `pixels` is untouched. If the new theme
  has fewer colors than the old one, indices beyond its range render as transparent (falls
  back to index-0 behavior) rather than erroring.
- `Uint8Array` caps the palette at 256 colors (indices 0–255). 33 leaves ample headroom, so
  the pixel type doesn't need revisiting even if the swatch count grows later. Pixel buffer
  stays small at 512×512 (256 KB max) either way.

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
  "version": 1,
  "width": 32,
  "height": 32,
  "pixels": "<base64 of the Uint8Array>",
  "themes": [{ "id": "default", "name": "Default", "colors": ["#000000", "#ffffff"] }],
  "activeThemeId": "default"
}
```

`version` guards future migrations (e.g. once animation frames are added). `core` owns
`serialize`/`deserialize`; both `web` and `vscode-extension` call into it rather than each
implementing (de)serialization.

## packages/web

React SPA (Vite). Structure:

```
src/
  components/   Canvas, Toolbar, PaletteEditor, ThemeSwitcher, BrushSizeControl
  hooks/        useDocument (useSyncExternalStore over core Document)
  io/           file open/save (File System Access API, with download-fallback for
                browsers that lack it), PNG export
  App.tsx, main.tsx
```

Runs standalone (open a `.dpaint` file via the File System Access API / drag-and-drop) and
is also the bundle embedded in the VSCode webview — see below.

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
- Palette: 32 user colors per theme (indices 1–32) + reserved transparent (index 0) = 33
  slots, well within the `Uint8Array` index range (0–255).
- Brushes: circle/square, adjustable integer size, precomputed offset masks.

## deferred (not designed now, flagged so today's choices don't block them)

- **Keyboard-only manipulation**: current design already routes all edits through
  `applyEdit`, so a keyboard-driven cursor + "stamp here" command reuses the same path as
  pointer input — no rework anticipated.
- **Animation (APNG)**: would extend `DotDocument` with a `frames: Uint8Array[]` (sharing
  `width`/`height`/`themes`) instead of a single `pixels` buffer, and `version: 2` in the
  file format. Not designed further now — revisit once the single-frame tool is solid.
- **WebAssembly**: the `render()` seam noted above is the intended replacement point; no
  other function is designed with this in mind yet.
