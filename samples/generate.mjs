// Regenerates the sample .dpaint / .dpaint-anim files in this directory from
// @dot-paint/core, so they always match the current file format exactly
// (rather than hand-edited JSON drifting out of sync with serialize()).
//
//   node samples/generate.mjs
//
// Requires packages/core to be built first (pnpm --filter @dot-paint/core run build).
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createDocument, createTheme, serialize } from "../packages/core/dist/index.js";

const samplesDir = fileURLToPath(new URL(".", import.meta.url));

// --- heart.dpaint: a single-frame image, two-tone heart on transparency ---

const HEART_ROWS = [
  "011000110",
  "111101111",
  "111111111",
  "111111111",
  "011111110",
  "001111100",
  "000111000",
  "000010000",
];

function buildHeart() {
  const theme = createTheme("sample-heart", "Sample: Heart", ["#e5484d", "#ff9aa2"]);
  const width = 16;
  const height = 16;
  const doc = createDocument(width, height, theme);
  const xOffset = Math.floor((width - HEART_ROWS[0].length) / 2);
  const yOffset = Math.floor((height - HEART_ROWS.length) / 2);

  HEART_ROWS.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === "0") return;
      // outline (row 0) in the darker color, fill in the lighter one
      const paletteIndex = y === 0 ? 1 : 2;
      doc.frames[0][(y + yOffset) * width + (x + xOffset)] = paletteIndex;
    });
  });

  return doc;
}

// --- bounce.dpaint-anim: a 6-frame ball bouncing on a floor line ---

function buildBounce() {
  const theme = createTheme("sample-bounce", "Sample: Bounce", ["#94a3b8", "#3b82f6"]);
  const width = 8;
  const height = 8;
  const frameCount = 6;
  const doc = createDocument(width, height, theme, frameCount);
  doc.frameIntervalMs = 120;

  const floorColor = 1;
  const ballColor = 2;
  const ballTops = [5, 3, 1, 1, 3, 5]; // top row of the 2x2 ball per frame

  doc.frames.forEach((frame, i) => {
    for (let x = 0; x < width; x++) frame[7 * width + x] = floorColor; // floor, every frame
    const top = ballTops[i];
    for (const dy of [0, 1]) {
      for (const dx of [0, 1]) {
        frame[(top + dy) * width + (3 + dx)] = ballColor;
      }
    }
  });

  return doc;
}

writeFileSync(`${samplesDir}heart.dpaint`, serialize(buildHeart()));
writeFileSync(`${samplesDir}bounce.dpaint-anim`, serialize(buildBounce()));

console.log("wrote samples/heart.dpaint and samples/bounce.dpaint-anim");
