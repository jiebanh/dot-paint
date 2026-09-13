import type { Document, Theme } from "@dot-paint/core";
import { createTheme, generateThemeId } from "@dot-paint/core";
import { useState } from "react";
import { loadThemeLibrary, saveThemeLibrary } from "../io/themeLibrary";

const STARTER_THEME_COLORS = [
  "#e8e8f0",
  "#0d0d14",
  "#8e2de2",
  "#1b6ca8",
  "#0f9b8e",
  "#c9a227",
  "#d63aa0",
  "#a8471f",
];

function loadOrSeedLibrary(): Theme[] {
  const library = loadThemeLibrary();
  if (library.length > 0) return library;
  const seeded = [createTheme("night", "Night", STARTER_THEME_COLORS)];
  saveThemeLibrary(seeded);
  return seeded;
}

interface ThemeLibraryPanelProps {
  document: Document;
  currentTheme: Theme;
}

export function ThemeLibraryPanel({ document: doc, currentTheme }: ThemeLibraryPanelProps) {
  const [library, setLibrary] = useState<Theme[]>(loadOrSeedLibrary);

  function persist(next: Theme[]) {
    setLibrary(next);
    saveThemeLibrary(next);
  }

  function handleSaveCurrent() {
    const name = window.prompt("Save current colors as a new theme:");
    if (!name) return;
    persist([...library, { id: generateThemeId(), name, colors: [...currentTheme.colors] }]);
  }

  function handleDelete(id: string) {
    persist(library.filter((theme) => theme.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" onClick={handleSaveCurrent}>
        Save current as new theme
      </button>
      {library.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>No saved themes yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {library.map((theme) => (
            <li key={theme.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button type="button" onClick={() => doc.applyTheme(theme)} style={{ flex: 1, textAlign: "left" }}>
                {theme.name}
              </button>
              <button type="button" onClick={() => handleDelete(theme.id)} aria-label={`delete ${theme.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
