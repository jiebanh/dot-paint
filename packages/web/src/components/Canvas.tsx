import type { BrushShape, CellDiff, Document } from "@dot-paint/core";
import { floodFill, render, Stroke } from "@dot-paint/core";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useDocument } from "../hooks/useDocument";
import { VIEWPORT_SIZE } from "../zoom";
import type { ColorPreview } from "./PaletteEditor";

export type ToolKind = "brush" | "bucket";

export interface PaintTool {
  kind: ToolKind;
  shape: BrushShape;
  size: number;
  paletteIndex: number;
}

interface CanvasProps {
  document: Document;
  tool: PaintTool;
  colorPreview?: ColorPreview | null;
  scale?: number;
  /** Options menu settings (issue #38) - all optional so Canvas keeps working with sane defaults on its own. */
  checkerColorA?: string;
  checkerColorB?: string;
  /** Transparency-checker square size, in image pixels. Non-integer by default - see the comment at its use below. */
  checkerUnit?: number;
  viewportBackground?: string;
  /** Guide lines (issue #46) - a display-only overlay, never part of the document or its PNG export. */
  showGuides?: boolean;
  /** Equal parts per axis; must be a power of 2 (see settings.ts's GUIDE_DIVISION_OPTIONS). */
  guideDivisions?: number;
  guideColor?: string;
}

/** Fractional positions (0..1) of the dividing lines for splitting an axis into `divisions` equal parts. */
function guideFractions(divisions: number): number[] {
  const fractions: number[] = [];
  for (let k = 1; k < divisions; k++) fractions.push(k / divisions);
  return fractions;
}

export function Canvas({
  document: doc,
  tool,
  colorPreview = null,
  scale = 16,
  checkerColorA = "#cccccc",
  checkerColorB = "#ffffff",
  checkerUnit = 0.5,
  viewportBackground = "#e5e5e5",
  showGuides = false,
  guideDivisions = 2,
  guideColor = "#ff0000",
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useDocument(doc);
  const strokeRef = useRef<Stroke | null>(null);
  const [previewDiffs, setPreviewDiffs] = useState<CellDiff[] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let pixels = state.pixels;
    if (previewDiffs) {
      pixels = Uint8Array.from(state.pixels);
      for (const diff of previewDiffs) pixels[diff.index] = diff.newValue;
    }

    // A palette color being dragged live (not yet committed to the theme, so
    // rendering it here - without touching Document - keeps a drag from
    // producing anything undo-able until it's actually released.
    let theme = state.theme;
    if (colorPreview) {
      theme = {
        ...theme,
        colors: theme.colors.map((c, i) => (i === colorPreview.paletteIndex ? colorPreview.color : c)),
      };
    }

    const rgba = render({ ...state, pixels, theme });
    ctx.putImageData(new ImageData(rgba, state.width, state.height), 0, 0);
  }, [state, previewDiffs, colorPreview]);

  function cellFromPointer(e: PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * state.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * state.height);
    return {
      x: Math.min(Math.max(x, 0), state.width - 1),
      y: Math.min(Math.max(y, 0), state.height - 1),
    };
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const { x, y } = cellFromPointer(e);

    if (tool.kind === "bucket") {
      // Click to confirm, not drag: one fill is one undo step, no stroke to track.
      const diffs = floodFill(state.pixels, state.width, state.height, x, y, tool.paletteIndex);
      if (diffs.length > 0) doc.applyEdit(diffs);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke = new Stroke(state.pixels, state.width, state.height, tool.shape, tool.size, tool.paletteIndex);
    stroke.addPoint(x, y);
    strokeRef.current = stroke;
    setPreviewDiffs(stroke.finish());
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const { x, y } = cellFromPointer(e);
    stroke.addPoint(x, y);
    setPreviewDiffs(stroke.finish());
  }

  function commitStroke() {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (!stroke) return;
    const diffs = stroke.finish();
    setPreviewDiffs(null);
    if (diffs.length > 0) doc.applyEdit(diffs);
  }

  return (
    <div
      style={{
        width: VIEWPORT_SIZE,
        height: VIEWPORT_SIZE,
        overflow: "auto",
        border: "1px solid #ccc",
        background: viewportBackground,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: state.width * scale,
          height: state.height * scale,
          border: "1px solid #666",
          boxShadow: "0 0 0 1px #fff",
          flexShrink: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={state.width}
          height={state.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitStroke}
          onPointerCancel={commitStroke}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
            touchAction: "none",
            cursor: tool.kind === "bucket" ? "cell" : "crosshair",
            // putImageData writes real alpha into the canvas bitmap, so a
            // transparent cell shows whatever is behind the element - this CSS
            // checkerboard (same colors as the transparent swatch in
            // PaletteEditor). A non-integer multiple of the pixel grid
            // (checkerUnit) is deliberate: a checker aligned to a clean 1x/2x
            // pixel multiple tends to blend into the art's own grid at a
            // glance, whereas an off-grid size reads unambiguously as a UI
            // pattern. background-size below is one full 2x2 checker tile, so
            // each individual square ends up at half that.
            background: `repeating-conic-gradient(${checkerColorA} 0% 25%, ${checkerColorB} 0% 50%) 0 0 / ${scale * checkerUnit * 2}px ${scale * checkerUnit * 2}px`,
          }}
        />
        {showGuides && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {guideFractions(guideDivisions).map((f) => (
              <div
                key={`v-${f}`}
                style={{ position: "absolute", left: `${f * 100}%`, top: 0, bottom: 0, width: 1, background: guideColor }}
              />
            ))}
            {guideFractions(guideDivisions).map((f) => (
              <div
                key={`h-${f}`}
                style={{ position: "absolute", top: `${f * 100}%`, left: 0, right: 0, height: 1, background: guideColor }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
