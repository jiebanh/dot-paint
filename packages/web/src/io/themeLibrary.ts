import { generateThemeId, MAX_PALETTE_SIZE, type Theme } from "@dot-paint/core";
import { downloadBlob } from "./fileIO";

const STORAGE_KEY = "dot-paint:theme-library";

/**
 * A theme library is just a named collection of Theme presets, independent of
 * any document - "applying" one (Document.applyTheme) copies its colors into
 * the current document. Stored in localStorage: themes are tiny (a few
 * hundred bytes each), so the simpler synchronous API is fine here, unlike
 * the pixel-buffer-sized autosave data in ../io/autosave.ts.
 */
export function loadThemeLibrary(): Theme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Theme[]) : [];
  } catch {
    return [];
  }
}

export function saveThemeLibrary(themes: Theme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

function themeFileName(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "theme"}.dpaint-theme.json`;
}

export function exportTheme(theme: Theme): void {
  const json = JSON.stringify({ name: theme.name, colors: theme.colors }, null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), themeFileName(theme.name));
}

/** Assigns a fresh id, so importing the same file twice (or a file matching a built-in) doesn't collide. */
export function parseThemeFile(json: string): Theme {
  const data: unknown = JSON.parse(json);
  const colors = (data as { colors?: unknown }).colors;
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as { name?: unknown }).name !== "string" ||
    !Array.isArray(colors) ||
    colors.length < 1 ||
    colors.length > MAX_PALETTE_SIZE ||
    !colors.every((c) => typeof c === "string")
  ) {
    throw new Error("not a valid dot-paint theme file");
  }
  const { name } = data as { name: string };
  return { id: generateThemeId(), name, colors: colors as string[] };
}

export function pickThemeFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve);
    };
    input.click();
  });
}
