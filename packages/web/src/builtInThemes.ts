import { createTheme, type Theme } from "@dot-paint/core";

/**
 * Always available, cannot be deleted (see ThemeLibraryPanel) - unlike a
 * user-saved theme (packages/web/src/io/themeLibrary.ts), these aren't
 * persisted anywhere; they're just always prepended to the library.
 */
export const BUILT_IN_THEMES: Theme[] = [
  createTheme("builtin-default", "Default", [
    "#1a1a1a",
    "#ffffff",
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f1c40f",
    "#9b59b6",
    "#e67e22",
  ]),
  createTheme("builtin-night", "Night", [
    "#e8e8f0",
    "#0d0d14",
    "#8e2de2",
    "#1b6ca8",
    "#0f9b8e",
    "#c9a227",
    "#d63aa0",
    "#a8471f",
  ]),
  createTheme("builtin-pastel", "Pastel", [
    "#2b2b2b",
    "#fdf6f0",
    "#f7b7a3",
    "#f6cd61",
    "#c3e8bd",
    "#a7d2cb",
    "#b4a7d6",
    "#f4a6c6",
  ]),
  createTheme("builtin-autumn", "Autumn", [
    "#2e1a10",
    "#fff3e0",
    "#c0392b",
    "#e67e22",
    "#d4a017",
    "#8b5a2b",
    "#6b8e23",
    "#a0522d",
  ]),
  createTheme("builtin-ocean", "Ocean", [
    "#031c2e",
    "#eaf6f8",
    "#004e64",
    "#00798c",
    "#00a5cf",
    "#9fffcb",
    "#25a18e",
    "#7ae7c7",
  ]),
  createTheme("builtin-forest", "Forest", [
    "#1b2e1a",
    "#f1f8e9",
    "#2d5a27",
    "#4c8c3a",
    "#8bc34a",
    "#c8e6a0",
    "#6d4c41",
    "#a1887f",
  ]),
  createTheme("builtin-sunset", "Sunset", [
    "#1a0f2e",
    "#fff1e6",
    "#ff6b6b",
    "#ff9f1c",
    "#ffbf69",
    "#e07a5f",
    "#9d4edd",
    "#f72585",
  ]),
  createTheme("builtin-grayscale", "Grayscale", [
    "#000000",
    "#ffffff",
    "#1a1a1a",
    "#333333",
    "#666666",
    "#999999",
    "#cccccc",
    "#e6e6e6",
  ]),
];

const BUILT_IN_IDS = new Set(BUILT_IN_THEMES.map((theme) => theme.id));

export function isBuiltInTheme(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}
