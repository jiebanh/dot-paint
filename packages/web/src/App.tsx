import type { BrushShape } from "@dot-paint/core";
import { createDocument, deserialize, Document, serialize, TRANSPARENT_INDEX } from "@dot-paint/core";
import { useEffect, useState } from "react";
import { BUILT_IN_THEMES } from "./builtInThemes";
import { BrushSizeControl } from "./components/BrushSizeControl";
import { Canvas, type PaintTool } from "./components/Canvas";
import { ColorPickerPanel } from "./components/ColorPickerPanel";
import { FileMenu } from "./components/FileMenu";
import { NewDocumentDialog } from "./components/NewDocumentDialog";
import { type ColorPreview, PaletteEditor } from "./components/PaletteEditor";
import { ThemeLibraryPanel } from "./components/ThemeLibraryPanel";
import { UndoRedoControls } from "./components/UndoRedoControls";
import { ZoomControl } from "./components/ZoomControl";
import { useDocument } from "./hooks/useDocument";
import { isVsCodeWebview, onHostMessage, postToHost } from "./io/vscodeBridge";
import { autoZoom } from "./zoom";

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
  const [zoom, setZoom] = useState(() => autoZoom(16, 16));

  // Re-fit the zoom whenever the document is replaced (new/open/vscode-init/
  // autosave-restore) - not on every edit, since `doc` only changes identity
  // when a different Document instance is swapped in via setDoc.
  useEffect(() => {
    const current = doc.getState();
    setZoom(autoZoom(current.width, current.height));
  }, [doc]);

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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Canvas document={doc} tool={tool} colorPreview={colorPreview} scale={zoom} />
          <ZoomControl zoom={zoom} onChange={setZoom} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ColorPickerPanel
            paletteIndex={tool.paletteIndex}
            color={state.theme.colors[tool.paletteIndex]}
            disabled={tool.paletteIndex === TRANSPARENT_INDEX}
            onPreview={(color) => setColorPreview({ paletteIndex: tool.paletteIndex, color })}
            onCommit={(color) => {
              doc.setThemeColor(tool.paletteIndex, color);
              setColorPreview(null);
            }}
          />

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
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 4 }}>size</div>
              <BrushSizeControl size={tool.size} onChange={(size) => setTool((t) => ({ ...t, size }))} />
            </div>
          </fieldset>

          <fieldset>
            <legend>color</legend>
            <PaletteEditor
              theme={state.theme}
              selectedIndex={tool.paletteIndex}
              onSelect={(paletteIndex) => setTool((t) => ({ ...t, paletteIndex }))}
              colorPreview={colorPreview}
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
