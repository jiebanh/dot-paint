# where constants live

A map of every notable constant in the project, grouped by the file that owns it. Written
because several constants share a name with an unrelated one elsewhere (two different
`MAX_SIZE`s, two different `PRESET_SIZES`s were the worst offenders) - use this to find or
add a constant without re-deriving where it lives from scratch.

The rule of thumb followed here: a constant stays local when it's tightly coupled to the one
piece of logic that enforces it (moving it elsewhere would just add an import for no real
gain); it moves to a shared file when the same *kind* of value (a size cap, a preset list)
was duplicated across components with no natural single owner. `packages/web/src/limits.ts`
exists for exactly that second case.

## packages/core

Data-model limits, enforced by the logic that lives right next to them - kept local rather
than centralized, since each is read by exactly one file's validation.

| Constant | File | Value | Meaning |
| --- | --- | --- | --- |
| `MAX_SIZE` | `document.ts` | 512 | Max canvas width/height, either axis. |
| `MAX_PALETTE_SIZE` | `document.ts` | 64 | Ceiling `Document.addThemeColor()` grows a theme's `colors` array to. |
| `PALETTE_SIZE` | `theme.ts` | 17 | Size a *new* theme starts at (1 transparent + 16 user colors) via `createTheme()` - not a ceiling, see `MAX_PALETTE_SIZE`. |
| `TRANSPARENT_INDEX` | `theme.ts` | 0 | The pixel index that always renders transparent. |
| `FILE_FORMAT_VERSION` | `serialize.ts` | 3 | Current `.dpaint` schema version; `deserialize()` migrates from v1 and v2. |
| `MAX_FRAMES` | `document.ts` | 256 | Ceiling `Document.addFrame()` grows an animation's `frames` array to. |
| `DEFAULT_FRAME_INTERVAL_MS` | `document.ts` | 100 | Frame interval a new document starts with. |
| `MIN_FRAME_INTERVAL_MS` / `MAX_FRAME_INTERVAL_MS` | `document.ts` | 20 / 10000 | Bounds `Document.setFrameInterval()` enforces. |

## packages/web/src/limits.ts

UI size caps and preset lists that were previously one-off consts inside the component that
used them - consolidated here once a second, differently-scoped constant with the same name
showed up elsewhere (e.g. `BrushSizeControl`'s old local `MAX_SIZE` vs. core's `MAX_SIZE`).

| Constant | Used by | Meaning |
| --- | --- | --- |
| `MAX_BRUSH_SIZE` | `BrushSizeControl.tsx` | Brush size slider/input ceiling. Unrelated to core's `MAX_SIZE`. |
| `BRUSH_SIZE_PRESETS` | `BrushSizeControl.tsx` | Quick-pick brush sizes. |
| `NEW_DOCUMENT_SIZE_PRESETS` | `NewDocumentDialog.tsx` | Quick-pick canvas sizes; the dialog's own slider still goes up to core's `MAX_SIZE`. |
| `MAX_PNG_EXPORT_SIZE` | `SaveAsDialog.tsx` | PNG export scale ceiling (caps output width/height). Unrelated to core's `MAX_SIZE`, though it happens to share the value 512. |

## packages/web/src/zoom.ts

Kept together with the `autoZoom()` function that consumes them, rather than moved into
`limits.ts` - these are display-scale numbers, not size/count caps, and reading them next to
the function that turns a canvas size into a zoom level is more legible than importing them
from elsewhere.

| Constant | Meaning |
| --- | --- |
| `ZOOM_PRESETS` | Quick-pick zoom multipliers shown in `ZoomControl`. |
| `MIN_ZOOM` / `MAX_ZOOM` | First/last of `ZOOM_PRESETS` - the slider's bounds. |
| `AUTO_FIT_TARGET` (private) | Target on-screen size `autoZoom()` fits a new document's longer side into. |
| `VIEWPORT_SIZE` | `Canvas`'s fixed on-screen box size - deliberately larger than `AUTO_FIT_TARGET` so the default zoom doesn't sit flush against the edge (see the comment at its definition). |

## packages/web/src/settings.ts

User-facing preferences, persisted to `localStorage` - a different category from the caps
above (these are meant to be changed via `OptionsDialog` and remembered, not just read).

| Constant | Meaning |
| --- | --- |
| `DEFAULT_SETTINGS` | The full default `AppSettings` object - checker colors/size, canvas/page background, guides, panel placement. |
| `GUIDE_DIVISION_OPTIONS` | Allowed guide-line division counts (powers of 2 only). |
| `PANEL_IDS` / `PANEL_LABELS` | The sidebar panels `OptionsDialog`'s placement UI and `App.tsx`'s layout both iterate over. |

## Storage keys and schema versions (local to their module)

Each of these is a private implementation detail of one storage module - not consolidated,
since mixing unrelated storage namespaces into one file would be more confusing than
scattering them, not less.

| Constant | File | Meaning |
| --- | --- | --- |
| `DB_NAME`, `STORE_NAME`, `DB_VERSION` | `io/autosave.ts` | IndexedDB database/store name and schema version (see `docs/autosave.md` for the version history). |
| `MAX_TOTAL_BYTES` | `io/autosave.ts` | Total auto-save storage budget (20 MiB), enforced by evicting oldest records. |
| `STORAGE_KEY` | `io/settings` via `settings.ts` | `localStorage` key for `AppSettings`. |
| `STORAGE_KEY` | `io/themeLibrary.ts` | `localStorage` key for the user's saved theme library (unrelated to the same-named key in `settings.ts` - both are private to their own file). |

## Misc component-local constants

Layout numbers and debounce delays that only ever matter to the one component that defines
them - not cataloged exhaustively above the fold, but listed here so a search still finds
them: `PaletteEditor.tsx`'s `SWATCH_SIZE`/`COLUMNS`, `FileMenu.tsx`'s `DEFAULT_NAME`/
`AUTOSAVE_DEBOUNCE_MS`, `App.tsx`'s `VSCODE_SYNC_DEBOUNCE_MS`, `ColorPickerPanel.tsx`'s
`PANEL_STYLE`/`CONTENT_STYLE`, `vscode-extension/src/exportPngCommand.ts`'s `SCALE_CHOICES`.
