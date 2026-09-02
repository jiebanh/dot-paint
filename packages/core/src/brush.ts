export type BrushShape = "circle" | "square";

export interface BrushOffset {
  dx: number;
  dy: number;
}

const maskCache = new Map<string, BrushOffset[]>();

export function getBrushMask(shape: BrushShape, size: number): BrushOffset[] {
  if (size < 1) throw new RangeError("brush size must be >= 1");
  const key = `${shape}:${size}`;
  const cached = maskCache.get(key);
  if (cached) return cached;

  const radius = (size - 1) / 2;
  const extent = Math.ceil(radius);
  const offsets: BrushOffset[] = [];
  for (let dy = -extent; dy <= extent; dy++) {
    for (let dx = -extent; dx <= extent; dx++) {
      const inShape =
        shape === "square"
          ? Math.abs(dx) <= radius + 0.5 && Math.abs(dy) <= radius + 0.5
          : dx * dx + dy * dy <= (radius + 0.5) * (radius + 0.5);
      if (inShape) offsets.push({ dx: dx || 0, dy: dy || 0 });
    }
  }
  maskCache.set(key, offsets);
  return offsets;
}

export function stampBrush(
  centerX: number,
  centerY: number,
  shape: BrushShape,
  size: number,
  width: number,
  height: number,
  out: Set<number>,
): void {
  for (const { dx, dy } of getBrushMask(shape, size)) {
    const x = centerX + dx;
    const y = centerY + dy;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      out.add(y * width + x);
    }
  }
}

export function walkLine(x0: number, y0: number, x1: number, y1: number, visit: (x: number, y: number) => void): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    visit(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Accumulates one pointer drag (mousedown -> mouseup) into a single diff list,
 * so a whole stroke becomes one undo step regardless of how many cells it touched.
 */
export class Stroke {
  private touched = new Map<number, number>();
  private lastPoint: { x: number; y: number } | null = null;

  constructor(
    private pixels: Uint8Array,
    private width: number,
    private height: number,
    private shape: BrushShape,
    private size: number,
    private paletteIndex: number,
  ) {}

  addPoint(x: number, y: number): void {
    const cells = new Set<number>();
    if (this.lastPoint) {
      walkLine(this.lastPoint.x, this.lastPoint.y, x, y, (lx, ly) => {
        stampBrush(lx, ly, this.shape, this.size, this.width, this.height, cells);
      });
    } else {
      stampBrush(x, y, this.shape, this.size, this.width, this.height, cells);
    }
    for (const index of cells) {
      if (!this.touched.has(index)) {
        this.touched.set(index, this.pixels[index]);
      }
    }
    this.lastPoint = { x, y };
  }

  finish(): { index: number; prevValue: number; newValue: number }[] {
    const diffs: { index: number; prevValue: number; newValue: number }[] = [];
    for (const [index, prevValue] of this.touched) {
      if (prevValue !== this.paletteIndex) {
        diffs.push({ index, prevValue, newValue: this.paletteIndex });
      }
    }
    return diffs;
  }
}
