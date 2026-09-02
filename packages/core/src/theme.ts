export type ColorHex = string;

/** index 0 (reserved transparent) + 32 user colors. */
export const PALETTE_SIZE = 33;

export const TRANSPARENT_INDEX = 0;

export interface Theme {
  id: string;
  name: string;
  /**
   * Length PALETTE_SIZE. colors[i] is the color for pixel index i.
   * colors[TRANSPARENT_INDEX] is never read by the renderer (index 0 always
   * renders transparent); it exists only so every other lookup is a direct
   * colors[pixelIndex] with no off-by-one.
   */
  colors: ColorHex[];
}

export function createTheme(id: string, name: string, userColors: ColorHex[] = []): Theme {
  if (userColors.length > PALETTE_SIZE - 1) {
    throw new RangeError(`a theme supports at most ${PALETTE_SIZE - 1} user colors, got ${userColors.length}`);
  }
  const colors = new Array<ColorHex>(PALETTE_SIZE).fill("#000000");
  colors[TRANSPARENT_INDEX] = "#00000000";
  userColors.forEach((color, i) => {
    colors[i + 1] = color;
  });
  return { id, name, colors };
}
