import type { Document, Theme } from "@dot-paint/core";
import { generateThemeId } from "@dot-paint/core";
import { useState } from "react";
import { BUILT_IN_THEMES, isBuiltInTheme } from "../builtInThemes";
import { exportTheme, loadThemeLibrary, parseThemeFile, pickThemeFile, saveThemeLibrary } from "../io/themeLibrary";

interface ThemeLibraryPanelProps {
  document: Document;
  currentTheme: Theme;
}

export function ThemeLibraryPanel({ document: doc, currentTheme }: ThemeLibraryPanelProps) {
  // themeLibrary.ts only ever holds user-saved themes; the built-ins are never persisted.
  const [userThemes, setUserThemes] = useState<Theme[]>(() => loadThemeLibrary());
  const [error, setError] = useState<string | null>(null);
  const library = [...BUILT_IN_THEMES, ...userThemes];

  function persist(next: Theme[]) {
    setUserThemes(next);
    saveThemeLibrary(next);
  }

  function handleSaveCurrent() {
    const name = window.prompt("Save current colors as a new theme:");
    if (!name) return;
    persist([...userThemes, { id: generateThemeId(), name, colors: [...currentTheme.colors] }]);
  }

  function handleDelete(id: string) {
    persist(userThemes.filter((theme) => theme.id !== id));
  }

  async function handleImport() {
    try {
      const json = await pickThemeFile();
      if (!json) return;
      persist([...userThemes, parseThemeFile(json)]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleSaveCurrent}>
          Save current as new theme
        </button>
        <button type="button" onClick={handleImport}>
          Import theme…
        </button>
      </div>
      {error && <p style={{ margin: 0, color: "crimson", fontSize: 12 }}>{error}</p>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        {library.map((theme) => (
          <li key={theme.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" onClick={() => doc.applyTheme(theme)} style={{ flex: 1, textAlign: "left" }}>
              {theme.name}
            </button>
            <button type="button" onClick={() => exportTheme(theme)} aria-label={`export ${theme.name}`}>
              ⭳
            </button>
            {!isBuiltInTheme(theme.id) && (
              <button type="button" onClick={() => handleDelete(theme.id)} aria-label={`delete ${theme.name}`}>
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
