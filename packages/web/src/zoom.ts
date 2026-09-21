export const ZOOM_PRESETS = [1, 2, 4, 8, 16, 32] as const;
export const MIN_ZOOM = ZOOM_PRESETS[0];
export const MAX_ZOOM = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];

/** Target for autoZoom's fit calculation - matches core's MAX_SIZE, so a 512x512 document displays at a clean 1x by default. */
const AUTO_FIT_TARGET = 512;

/**
 * Canvas's on-screen viewport box size (packages/web/src/components/Canvas.tsx).
 * Larger than AUTO_FIT_TARGET on purpose: at MAX_SIZE (512px), the canvas at
 * its default auto-fit zoom should sit with room to spare, not flush against
 * the viewport edge where drawing near the border is awkward and scrolling
 * kicks in immediately.
 */
export const VIEWPORT_SIZE = 560;

/** Picks the largest preset zoom that keeps the canvas's longer side within a comfortable on-screen budget. */
export function autoZoom(width: number, height: number): number {
  const fit = AUTO_FIT_TARGET / Math.max(width, height);
  let chosen: number = MIN_ZOOM;
  for (const preset of ZOOM_PRESETS) {
    if (preset <= fit) chosen = preset;
  }
  return chosen;
}
