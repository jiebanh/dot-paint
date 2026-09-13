import type { BrushShape } from "@dot-paint/core";
import { createDocument, deserialize, Document, serialize } from "@dot-paint/core";
import { useEffect, useState } from "react";
import { BUILT_IN_THEMES } from "./builtInThemes";
import { Canvas, type PaintTool } from "./components/Canvas";
import { FileMenu } from "./components/FileMenu";
import { NewDocumentDialog } from "./components/NewDocumentDialog";
import { type ColorPreview, PaletteEditor } from "./components/PaletteEditor";
import { ThemeLibraryPanel } from "./components/ThemeLibraryPanel";
import { UndoRedoControls } from "./components/UndoRedoControls";
import { useDocument } from "./hooks/useDocument";
import { isVsCodeWebview, onHostMessage, postToHost } from "./io/vscodeBridge";

const VSCODE_SYNC_DEBOUNCE_MS = 300;

function isInitMessage(message: unknown): message is { type: "init"; json: string } {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "init" &&
    typeof (message as { json?: unknown }).json === "string"
  );
}

function createDefaultDocument(width = 16, height = 16): Document {
  return new Document(createDocument(width, height, BUILT_IN_THEMES[0]));
}

export function App() {
  const [doc, setDoc] = useState<Document>(() => createDefaultDocument());
  const [createError, setCreateError] = useState<string | null>(null);
  const state = useDocument(doc);
  const [tool, setTool] = useState<PaintTool>({ shape: "square", size: 1, paletteIndex: 1 });
  const [colorPreview, setColorPreview] = useState<ColorPreview | null>(null);

  // In a VSCode webview, the extension host owns the file; it sends the real
  // content once this reports "ready" (a fresh blank canvas is just the
  // placeholder until that arrives).
  useEffect(() => {
    if (!isVsCodeWebview()) return;
    const unsubscribe = onHostMessage((message) => {
      if (isInitMessage(message)) setDoc(new Document(deserialize(message.json)));
    });
    postToHost({ type: "ready" });
    return unsubscribe;
  }, []);

  // Report edits back to the host (debounced) so it can track dirty state and
  // know what to write on save - editing itself stays entirely in the webview.
  useEffect(() => {
    if (!isVsCodeWebview()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const send = () => postToHost({ type: "changed", json: serialize(doc.getState()) });
    const unsubscribe = doc.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(send, VSCODE_SYNC_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [doc]);

  function handleCreate(width: number, height: number) {
    try {
      setDoc(createDefaultDocument(width, height));
      setCreateError(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>dot-paint</h1>
      <p>
        {state.width}×{state.height}, theme "{state.theme.name}"
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <NewDocumentDialog onCreate={handleCreate} />
        {!isVsCodeWebview() && <FileMenu document={doc} onOpen={setDoc} />}
        <UndoRedoControls document={doc} />
      </div>
      {createError && <p style={{ color: "crimson" }}>{createError}</p>}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <Canvas document={doc} tool={tool} colorPreview={colorPreview} />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <fieldset>
            <legend>brush</legend>
            {(["square", "circle"] as BrushShape[]).map((shape) => (
              <label key={shape} style={{ display: "block" }}>
                <input
                  type="radio"
                  name="shape"
                  checked={tool.shape === shape}
                  onChange={() => setTool((t) => ({ ...t, shape }))}
                />
                {shape}
              </label>
            ))}
            <label style={{ display: "block", marginTop: 8 }}>
              size
              <input
                type="number"
                min={1}
                max={8}
                value={tool.size}
                onChange={(e) => setTool((t) => ({ ...t, size: Number(e.target.value) || 1 }))}
                style={{ width: 48, marginLeft: 8 }}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>color</legend>
            <PaletteEditor
              document={doc}
              theme={state.theme}
              selectedIndex={tool.paletteIndex}
              onSelect={(paletteIndex) => setTool((t) => ({ ...t, paletteIndex }))}
              onPreview={setColorPreview}
            />
          </fieldset>

          <fieldset>
            <legend>theme library</legend>
            <ThemeLibraryPanel document={doc} currentTheme={state.theme} />
          </fieldset>
        </div>
      </div>
    </main>
  );
}
