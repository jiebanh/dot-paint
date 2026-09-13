import type { Document } from "@dot-paint/core";
import { useEffect } from "react";

interface UndoRedoControlsProps {
  document: Document;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function UndoRedoControls({ document: doc }: UndoRedoControlsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) {
        doc.redo();
      } else {
        doc.undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doc]);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={() => doc.undo()} disabled={!doc.history.canUndo} title="Ctrl/Cmd+Z">
        Undo
      </button>
      <button type="button" onClick={() => doc.redo()} disabled={!doc.history.canRedo} title="Ctrl/Cmd+Shift+Z">
        Redo
      </button>
    </div>
  );
}
