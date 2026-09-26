import type { BrushShape } from "@dot-paint/core";
import { createDocument, deserialize, Document, serialize, TRANSPARENT_INDEX } from "@dot-paint/core";
import { type ReactNode, useEffect, useState } from "react";
import { BUILT_IN_THEMES } from "./builtInThemes";
import { BrushSizeControl } from "./components/BrushSizeControl";
import { Canvas, type PaintTool, type ToolKind } from "./components/Canvas";
import { ColorPickerPanel } from "./components/ColorPickerPanel";
import { FileMenu } from "./components/FileMenu";
import { FrameStrip } from "./components/FrameStrip";
import { NewDocumentDialog } from "./components/NewDocumentDialog";
import { OptionsDialog } from "./components/OptionsDialog";
import { type ColorPreview, PaletteEditor } from "./components/PaletteEditor";
import { ThemeLibraryPanel } from "./components/ThemeLibraryPanel";
import { UndoRedoControls } from "./components/UndoRedoControls";
import { ZoomControl } from "./components/ZoomControl";
import { useDocument } from "./hooks/useDocument";
import { isVsCodeWebview, onHostMessage, postToHost } from "./io/vscodeBridge";
import { loadSettings, PANEL_IDS, saveSettings } from "./settings";
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
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [createError, setCreateError] = useState<string | null>(null);
  const state = useDocument(doc);
  const [tool, setTool] = useState<PaintTool>({ kind: "brush", shape: "square", size: 1, paletteIndex: 1 });
  const [colorPreview, setColorPreview] = useState<ColorPreview | null>(null);
  const [zoom, setZoom] = useState(() => autoZoom(16, 16));
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Re-fit the zoom whenever the document is replaced (new/open/vscode-init/
  // autosave-restore) - not on every edit, since `doc` only changes identity
  // when a different Document instance is swapped in via setDoc.
  useEffect(() => {
    const current = doc.getState();
    setZoom(autoZoom(current.width, current.height));
  }, [doc]);

  // The selected palette index can outlive the palette it was chosen from - a
  // new/opened document's theme, an applied theme, or undoing a palette-add
  // can all be shorter than the previous theme.colors. Left alone, the next
  // theme.colors[tool.paletteIndex] read (ColorPickerPanel) would be
  // undefined and crash the render. Clamp back to a valid index instead.
  useEffect(() => {
    if (tool.paletteIndex >= state.theme.colors.length) {
      setTool((t) => ({ ...t, paletteIndex: 1 }));
    }
  }, [tool.paletteIndex, state.theme.colors.length]);

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

  function handleCreate(width: number, height: number, name: string | undefined) {
    try {
      setDoc(createDefaultDocument(width, height));
      setFileName(name && (name.endsWith(".dpaint") ? name : `${name}.dpaint`));
      setCreateError(null);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  }

  const panelContent: Record<(typeof PANEL_IDS)[number], ReactNode> = {
    colorPicker: (
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
    ),
    tool: (
      <fieldset>
        <legend>tool</legend>
        {(["brush", "bucket"] as ToolKind[]).map((kind) => (
          <label key={kind} style={{ display: "block" }}>
            <input
              type="radio"
              name="tool-kind"
              checked={tool.kind === kind}
              onChange={() => setTool((t) => ({ ...t, kind }))}
            />
            {kind}
          </label>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 8, opacity: tool.kind === "brush" ? 1 : 0.5 }}>
          {(["square", "circle"] as BrushShape[]).map((shape) => (
            <label key={shape} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="radio"
                name="shape"
                disabled={tool.kind !== "brush"}
                checked={tool.shape === shape}
                onChange={() => setTool((t) => ({ ...t, shape }))}
              />
              {shape}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 4 }}>size</div>
          <BrushSizeControl
            size={tool.size}
            onChange={(size) => setTool((t) => ({ ...t, size }))}
            disabled={tool.kind !== "brush"}
          />
        </div>
      </fieldset>
    ),
    palette: (
      <fieldset>
        <legend>color</legend>
        <PaletteEditor
          document={doc}
          theme={state.theme}
          selectedIndex={tool.paletteIndex}
          onSelect={(paletteIndex) => setTool((t) => ({ ...t, paletteIndex }))}
          colorPreview={colorPreview}
        />
      </fieldset>
    ),
    themeLibrary: (
      <fieldset>
        <legend>theme library</legend>
        <ThemeLibraryPanel document={doc} currentTheme={state.theme} />
      </fieldset>
    ),
  };

  const leftPanels = PANEL_IDS.filter((id) => settings.panelSides[id] === "left");
  const rightPanels = PANEL_IDS.filter((id) => settings.panelSides[id] === "right");

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, minHeight: "100vh", background: settings.pageBackgroundColor }}>
      <h1>dot-paint</h1>
      <p>
        {fileName ?? "untitled.dpaint"} — {state.width}×{state.height}, theme "{state.theme.name}", {state.frames.length}{" "}
        frame{state.frames.length === 1 ? "" : "s"}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <NewDocumentDialog onCreate={handleCreate} />
        {!isVsCodeWebview() && (
          <FileMenu
            document={doc}
            fileName={fileName}
            onOpen={(newDoc, name) => {
              setDoc(newDoc);
              setFileName(name);
            }}
            onFileNameChange={setFileName}
          />
        )}
        <UndoRedoControls document={doc} />
        <OptionsDialog settings={settings} onChange={setSettings} />
      </div>
      {createError && <p style={{ color: "crimson" }}>{createError}</p>}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {leftPanels.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leftPanels.map((id) => (
              <div key={id}>{panelContent[id]}</div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Canvas
            document={doc}
            tool={tool}
            colorPreview={colorPreview}
            scale={zoom}
            checkerColorA={settings.transparentCheckerColorA}
            checkerColorB={settings.transparentCheckerColorB}
            checkerUnit={settings.transparentCheckerUnit}
            viewportBackground={settings.canvasBackgroundColor}
            showGuides={settings.guidesEnabled}
            guideDivisions={settings.guideDivisions}
            guideColor={settings.guideColor}
          />
          <ZoomControl zoom={zoom} onChange={setZoom} />
          <FrameStrip document={doc} />
        </div>

        {rightPanels.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rightPanels.map((id) => (
              <div key={id}>{panelContent[id]}</div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
