import type { DotDocument } from "@dot-paint/core";
import { render } from "@dot-paint/core";
import { useEffect, useRef } from "react";

interface CanvasProps {
  doc: DotDocument;
  scale?: number;
}

export function Canvas({ doc, scale = 16 }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rgba = render(doc);
    ctx.putImageData(new ImageData(rgba, doc.width, doc.height), 0, 0);
  }, [doc]);

  return (
    <canvas
      ref={canvasRef}
      width={doc.width}
      height={doc.height}
      style={{
        width: doc.width * scale,
        height: doc.height * scale,
        imageRendering: "pixelated",
        border: "1px solid #ccc",
      }}
    />
  );
}
