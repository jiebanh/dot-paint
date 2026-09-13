import type { Theme } from "@dot-paint/core";

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
