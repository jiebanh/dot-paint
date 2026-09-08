import type { Document, DotDocument } from "@dot-paint/core";

interface ThemeSwitcherProps {
  document: Document;
  state: DotDocument;
}

export function ThemeSwitcher({ document: doc, state }: ThemeSwitcherProps) {
  return (
    <select value={state.activeThemeId} onChange={(e) => doc.setActiveTheme(e.target.value)}>
      {state.themes.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </select>
  );
}
