/**
 * UI-tunable "how big / how many" constants that don't belong to any single
 * component. Consolidated here (instead of one local const per component)
 * specifically because several of these previously shared a name with an
 * unrelated constant elsewhere (two different `MAX_SIZE`s, two different
 * `PRESET_SIZES`s) - easy to mix up when grepping. See docs/constants.md for
 * the full map of every constant in the project, including the ones that
 * intentionally stayed local (e.g. core's MAX_SIZE for canvas dimensions).
 */

/** Upper bound for BrushSizeControl's slider/number input. Unrelated to core's MAX_SIZE (canvas dimensions). */
export const MAX_BRUSH_SIZE = 128;
export const BRUSH_SIZE_PRESETS = [1, 2, 4, 8, 16, 32, 64, 128] as const;

/** Canvas size presets offered in NewDocumentDialog. Capped by core's MAX_SIZE (512), not repeated here. */
export const NEW_DOCUMENT_SIZE_PRESETS = [8, 16, 24, 32, 48, 64, 128, 256, 512] as const;

/** Upper bound for the PNG export scale in SaveAsDialog. Unrelated to core's MAX_SIZE. */
export const MAX_PNG_EXPORT_SIZE = 512;
