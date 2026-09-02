/**
 * Core data model for dot-paint.
 *
 * The canvas is stored as a grid of palette *indices* (not raw colors), so
 * updating a single palette color instantly updates every dot that uses it.
 * This module has no DOM dependencies so it can be unit tested with Node
 * directly and reused by the browser UI.
 */

'use strict';

const DEFAULT_PALETTE = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
];

/**
 * Creates a new paint model.
 * @param {number} width Grid width in dots.
 * @param {number} height Grid height in dots.
 * @param {string[]} [palette] Initial palette colors (defaults to 8 colors).
 * @param {number} [background] Palette index used to fill the grid initially.
 */
function createModel(width, height, palette, background) {
  if (!Number.isInteger(width) || width <= 0) {
    throw new RangeError('width must be a positive integer');
  }
  if (!Number.isInteger(height) || height <= 0) {
    throw new RangeError('height must be a positive integer');
  }

  const resolvedPalette = palette && palette.length > 0 ? palette.slice() : DEFAULT_PALETTE.slice();
  const backgroundIndex = Number.isInteger(background) ? background : 1;
  if (backgroundIndex < 0 || backgroundIndex >= resolvedPalette.length) {
    throw new RangeError('background must be a valid palette index');
  }

  return {
    width,
    height,
    palette: resolvedPalette,
    pixels: new Array(width * height).fill(backgroundIndex),
  };
}

function assertInBounds(model, x, y) {
  if (x < 0 || x >= model.width || y < 0 || y >= model.height) {
    throw new RangeError(`(${x}, ${y}) is out of bounds`);
  }
}

function assertValidPaletteIndex(model, index) {
  if (!Number.isInteger(index) || index < 0 || index >= model.palette.length) {
    throw new RangeError(`invalid palette index: ${index}`);
  }
}

/** Returns the palette index stored at (x, y). */
function getPixel(model, x, y) {
  assertInBounds(model, x, y);
  return model.pixels[y * model.width + x];
}

/** Sets the palette index at (x, y) to paint that dot. */
function setPixel(model, x, y, paletteIndex) {
  assertInBounds(model, x, y);
  assertValidPaletteIndex(model, paletteIndex);
  model.pixels[y * model.width + x] = paletteIndex;
}

/** Returns the hex color currently assigned to (x, y). */
function getPixelColor(model, x, y) {
  return model.palette[getPixel(model, x, y)];
}

/**
 * Changes a palette color. Every dot referencing that palette index
 * immediately renders with the new color, since dots only store indices.
 */
function setPaletteColor(model, index, color) {
  assertValidPaletteIndex(model, index);
  model.palette[index] = color;
}

/** Adds a new color to the end of the palette, returning its index. */
function addPaletteColor(model, color) {
  model.palette.push(color);
  return model.palette.length - 1;
}

const paintModel = {
  DEFAULT_PALETTE,
  createModel,
  getPixel,
  setPixel,
  getPixelColor,
  setPaletteColor,
  addPaletteColor,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = paintModel;
}
if (typeof window !== 'undefined') {
  window.paintModel = paintModel;
}
