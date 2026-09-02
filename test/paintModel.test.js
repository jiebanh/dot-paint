'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_PALETTE,
  createModel,
  getPixel,
  setPixel,
  getPixelColor,
  setPaletteColor,
  addPaletteColor,
} = require('../src/paintModel');

test('createModel builds a grid filled with the background palette index', () => {
  const model = createModel(3, 2);
  assert.equal(model.width, 3);
  assert.equal(model.height, 2);
  assert.deepEqual(model.palette, DEFAULT_PALETTE);
  assert.equal(model.pixels.length, 6);
  assert.ok(model.pixels.every((index) => index === 1));
});

test('createModel validates dimensions and background index', () => {
  assert.throws(() => createModel(0, 2), RangeError);
  assert.throws(() => createModel(2, -1), RangeError);
  assert.throws(() => createModel(2, 2, ['#000000'], 5), RangeError);
});

test('setPixel/getPixel round-trip a palette index', () => {
  const model = createModel(4, 4);
  setPixel(model, 1, 2, 3);
  assert.equal(getPixel(model, 1, 2), 3);
});

test('setPixel/getPixel reject out-of-bounds coordinates', () => {
  const model = createModel(2, 2);
  assert.throws(() => setPixel(model, 5, 0, 0), RangeError);
  assert.throws(() => getPixel(model, 0, -1), RangeError);
});

test('setPixel rejects an invalid palette index', () => {
  const model = createModel(2, 2);
  assert.throws(() => setPixel(model, 0, 0, 99), RangeError);
});

test('setPaletteColor updates the color of every dot using that index', () => {
  const model = createModel(2, 2);
  setPixel(model, 0, 0, 2);
  setPixel(model, 1, 1, 2);

  setPaletteColor(model, 2, '#123456');

  assert.equal(getPixelColor(model, 0, 0), '#123456');
  assert.equal(getPixelColor(model, 1, 1), '#123456');
});

test('setPaletteColor rejects an invalid palette index', () => {
  const model = createModel(2, 2);
  assert.throws(() => setPaletteColor(model, 42, '#123456'), RangeError);
});

test('addPaletteColor appends a new color and returns its index', () => {
  const model = createModel(1, 1, ['#000000', '#ffffff']);
  const index = addPaletteColor(model, '#abcdef');
  assert.equal(index, 2);
  assert.equal(model.palette[2], '#abcdef');
});
