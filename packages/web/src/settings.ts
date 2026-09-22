export interface AppSettings {
  transparentCheckerColorA: string;
  transparentCheckerColorB: string;
  /** Checker square size, in image pixels. */
  transparentCheckerUnit: number;
  /** Background behind the canvas viewport (outside the drawn image, inside its border). */
  canvasBackgroundColor: string;
  /** Background of the page itself, outside the canvas viewport. */
  pageBackgroundColor: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  transparentCheckerColorA: "#cccccc",
  transparentCheckerColorB: "#ffffff",
  transparentCheckerUnit: 0.5,
  canvasBackgroundColor: "#e5e5e5",
  pageBackgroundColor: "#ffffff",
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
