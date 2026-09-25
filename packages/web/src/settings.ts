export interface AppSettings {
  transparentCheckerColorA: string;
  transparentCheckerColorB: string;
  /** Checker square size, in image pixels. */
  transparentCheckerUnit: number;
  /** Background behind the canvas viewport (outside the drawn image, inside its border). */
  canvasBackgroundColor: string;
  /** Background of the page itself, outside the canvas viewport. */
  pageBackgroundColor: string;
  guidesEnabled: boolean;
  /** How many equal parts to divide the canvas into, per axis - must be a power of 2 (see GUIDE_DIVISION_OPTIONS). */
  guideDivisions: number;
  guideColor: string;
  /** Which side of the canvas each sidebar panel docks to (issue #26). */
  panelSides: Record<PanelId, PanelSide>;
}

/** Only powers of 2 - each doubling adds one more line at the midpoint of every existing gap. */
export const GUIDE_DIVISION_OPTIONS = [2, 4, 8, 16, 32] as const;

export type PanelId = "colorPicker" | "tool" | "palette" | "themeLibrary";
export type PanelSide = "left" | "right";

export const PANEL_IDS: PanelId[] = ["colorPicker", "tool", "palette", "themeLibrary"];

export const PANEL_LABELS: Record<PanelId, string> = {
  colorPicker: "color picker",
  tool: "tool",
  palette: "palette",
  themeLibrary: "theme library",
};

export const DEFAULT_SETTINGS: AppSettings = {
  transparentCheckerColorA: "#cccccc",
  transparentCheckerColorB: "#ffffff",
  transparentCheckerUnit: 0.5,
  canvasBackgroundColor: "#e5e5e5",
  pageBackgroundColor: "#ffffff",
  guidesEnabled: false,
  guideDivisions: 2,
  guideColor: "#ff0000",
  panelSides: {
    colorPicker: "right",
    tool: "right",
    palette: "right",
    themeLibrary: "right",
  },
};

const STORAGE_KEY = "dot-paint:settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Deep-merged so a settings blob saved before a new panel existed still
      // gets a default side for it, instead of that panel vanishing from both.
      panelSides: { ...DEFAULT_SETTINGS.panelSides, ...parsed.panelSides },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // best-effort; a full quota or a disabled localStorage just means settings don't persist
  }
}
