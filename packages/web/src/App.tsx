import { createDocument, createTheme, Document } from "@dot-paint/core";
import { useMemo } from "react";
import { Canvas } from "./components/Canvas";
import { useDocument } from "./hooks/useDocument";

function createDefaultDocument(): Document {
  const theme = createTheme("default", "Default", ["#1a1a1a", "#ffffff", "#e74c3c", "#3498db"]);
  return new Document(createDocument(16, 16, [theme]));
}

export function App() {
  const doc = useMemo(() => createDefaultDocument(), []);
  const state = useDocument(doc);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>dot-paint</h1>
      <p>
        {state.width}×{state.height}, theme "{state.activeThemeId}"
      </p>
      <Canvas doc={state} />
    </main>
  );
}
