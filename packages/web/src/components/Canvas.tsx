import type { BrushShape, CellDiff, Document } from "@dot-paint/core";
import { render, Stroke } from "@dot-paint/core";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useDocument } from "../hooks/useDocument";

export interface PaintTool {
  shape: BrushShape;
  size: number;
  paletteIndex: number;
}

interface CanvasProps {
  document: Document;
  tool: PaintTool;
  scale?: number;
}

export function Canvas({ document: doc, tool, scale = 16 }: CanvasProps) {
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
    const rgba = render({ ...state, pixels });
    ctx.putImageData(new ImageData(rgba, state.width, state.height), 0, 0);
  }, [state, previewDiffs]);

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
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke = new Stroke(state.pixels, state.width, state.height, tool.shape, tool.size, tool.paletteIndex);
    const { x, y } = cellFromPointer(e);
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
    <canvas
      ref={canvasRef}
      width={state.width}
      height={state.height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitStroke}
      onPointerCancel={commitStroke}
      style={{
        width: state.width * scale,
        height: state.height * scale,
        imageRendering: "pixelated",
        border: "1px solid #ccc",
        touchAction: "none",
        cursor: "crosshair",
      }}
    />
  );
}
