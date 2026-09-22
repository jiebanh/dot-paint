import type { CellDiff } from "./document";

/**
 * Flood-fills the 4-connected region of matching-color cells starting at
 * (startX, startY) with newValue. Pure and DOM-free like brush.ts: returns a
 * CellDiff[] meant to be passed straight to Document.applyEdit(), so one fill
 * is one undo step. Iterative (not recursive), since a 512x512 canvas can
 * have up to 262144 connected cells - well past a safe recursion depth.
 */
export function floodFill(
  pixels: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  newValue: number,
): CellDiff[] {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return [];

  const startIndex = startY * width + startX;
  const targetValue = pixels[startIndex];
  if (targetValue === newValue) return [];

  const visited = new Uint8Array(pixels.length);
  const stack: number[] = [startIndex];
  visited[startIndex] = 1;
  const diffs: CellDiff[] = [];

  while (stack.length > 0) {
    const index = stack.pop()!;
    diffs.push({ index, prevValue: targetValue, newValue });

    const x = index % width;
    const y = (index - x) / width;

    const neighbors: number[] = [];
    if (x > 0) neighbors.push(index - 1);
    if (x < width - 1) neighbors.push(index + 1);
    if (y > 0) neighbors.push(index - width);
    if (y < height - 1) neighbors.push(index + width);

    for (const neighbor of neighbors) {
      if (!visited[neighbor] && pixels[neighbor] === targetValue) {
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }
  }

  return diffs;
}
