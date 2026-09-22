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
}

/** Only powers of 2 - each doubling adds one more line at the midpoint of every existing gap. */
export const GUIDE_DIVISION_OPTIONS = [2, 4, 8, 16, 32] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  transparentCheckerColorA: "#cccccc",
  transparentCheckerColorB: "#ffffff",
  transparentCheckerUnit: 0.5,
  canvasBackgroundColor: "#e5e5e5",
  pageBackgroundColor: "#ffffff",
  guidesEnabled: false,
  guideDivisions: 2,
  guideColor: "#ff0000",
};

const STORAGE_KEY = "dot-paint:settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
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
