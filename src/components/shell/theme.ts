
export type Theme = "light" | "dark";

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Applies the theme and remembers it in a cookie so the server renders it without a flash. */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `jo_theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
