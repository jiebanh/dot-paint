export const ZOOM_PRESETS = [1, 2, 4, 8, 16, 32] as const;
export const MIN_ZOOM = ZOOM_PRESETS[0];
export const MAX_ZOOM = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];

/**
 * Also Canvas's on-screen viewport box size (packages/web/src/components/Canvas.tsx):
 * the default zoom is chosen to just fit inside it, so nothing needs to
 * scroll until the user zooms in past the auto-fit level.
 */
export const VIEWPORT_SIZE = 480;

/** Picks the largest preset zoom that keeps the canvas's longer side within a comfortable on-screen budget. */
export function autoZoom(width: number, height: number): number {
  const fit = VIEWPORT_SIZE / Math.max(width, height);
  let chosen: number = MIN_ZOOM;
  for (const preset of ZOOM_PRESETS) {
    if (preset <= fit) chosen = preset;
  }
  return chosen;
}
