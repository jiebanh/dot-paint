import type { Document } from "@dot-paint/core";
import { MAX_FRAME_INTERVAL_MS, MAX_FRAMES, MIN_FRAME_INTERVAL_MS, render } from "@dot-paint/core";
import { useEffect, useRef, useState } from "react";
import { useDocument } from "../hooks/useDocument";

const THUMBNAIL_SIZE = 40;

interface FrameThumbnailProps {
  document: Document;
  frameIndex: number;
  selected: boolean;
  onSelect: () => void;
}

/** Renders one frame's pixels independently of whichever frame is currently active/edited. */
function FrameThumbnail({ document: doc, frameIndex, selected, onSelect }: FrameThumbnailProps) {
  const state = useDocument(doc);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rgba = render(state, frameIndex);
    ctx.putImageData(new ImageData(rgba, state.width, state.height), 0, 0);
  }, [state, frameIndex]);

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`frame ${frameIndex + 1}`}
      style={{
        padding: 2,
        border: selected ? "2px solid #000" : "1px solid #999",
        background: "#fff",
        cursor: "pointer",
        display: "flex",
      }}
    >
      <canvas
        ref={canvasRef}
        width={state.width}
        height={state.height}
        style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, imageRendering: "pixelated", display: "block" }}
      />
    </button>
  );
}

interface FrameStripProps {
  document: Document;
}

export function FrameStrip({ document: doc }: FrameStripProps) {
  const state = useDocument(doc);
  const [isPlaying, setIsPlaying] = useState(false);
  const frameCount = state.frames.length;

  // Playback just steps the shared activeFrameIndex, the same one editing uses -
  // reading doc.getState() fresh each tick (rather than closing over `state`)
  // keeps this correct if frames are added/removed/reordered while playing.
  useEffect(() => {
    if (!isPlaying || frameCount <= 1) return;
    const timer = setInterval(() => {
      const current = doc.getState();
      doc.setActiveFrame((current.activeFrameIndex + 1) % current.frames.length);
    }, state.frameIntervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, state.frameIntervalMs, frameCount, doc]);

  useEffect(() => {
    if (frameCount <= 1) setIsPlaying(false);
  }, [frameCount]);

  return (
    <fieldset>
      <legend>frames</legend>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {state.frames.map((_, i) => (
          <FrameThumbnail
            key={i}
            document={doc}
            frameIndex={i}
            selected={i === state.activeFrameIndex}
            onSelect={() => doc.setActiveFrame(i)}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => doc.addFrame(false)} disabled={frameCount >= MAX_FRAMES} title="add a blank frame">
          + frame
        </button>
        <button
          type="button"
          onClick={() => doc.addFrame(true)}
          disabled={frameCount >= MAX_FRAMES}
          title="duplicate the current frame"
        >
          duplicate
        </button>
        <button type="button" onClick={() => doc.removeFrame()} disabled={frameCount <= 1} title="delete the current frame">
          delete
        </button>
        <button
          type="button"
          onClick={() => doc.moveFrame("left")}
          disabled={state.activeFrameIndex === 0}
          title="move frame left"
          aria-label="move frame left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => doc.moveFrame("right")}
          disabled={state.activeFrameIndex === frameCount - 1}
          title="move frame right"
          aria-label="move frame right"
        >
          →
        </button>
        <button type="button" onClick={() => setIsPlaying((p) => !p)} disabled={frameCount <= 1}>
          {isPlaying ? "Stop" : "Play"}
        </button>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        interval
        <input
          type="range"
          min={MIN_FRAME_INTERVAL_MS}
          max={MAX_FRAME_INTERVAL_MS}
          step={10}
          value={state.frameIntervalMs}
          onChange={(e) => doc.setFrameInterval(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ width: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{state.frameIntervalMs}ms</span>
      </label>
    </fieldset>
  );
}
