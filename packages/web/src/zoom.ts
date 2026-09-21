export const ZOOM_PRESETS = [1, 2, 4, 8, 16, 32] as const;
export const MIN_ZOOM = ZOOM_PRESETS[0];
export const MAX_ZOOM = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];

const TARGET_DISPLAY_SIZE = 480;

/** Picks the largest preset zoom that keeps the canvas's longer side within a comfortable on-screen budget. */
export function autoZoom(width: number, height: number): number {
  const fit = TARGET_DISPLAY_SIZE / Math.max(width, height);
  let chosen: number = MIN_ZOOM;
  for (const preset of ZOOM_PRESETS) {
    if (preset <= fit) chosen = preset;
  }
  return chosen;
}
