import { STORAGE_KEYS, readString, writeString } from "../storage/local.storage.js";

export function initTheme({ themeIcon, themeToggleButton, themeLabel }) {
  const stored = readString(STORAGE_KEYS.THEME_KEY, "dark");
  applyTheme(stored, { themeIcon, themeToggleButton, themeLabel });
}

export function toggleTheme({ themeIcon, themeToggleButton, themeLabel }) {
  const isDark = document.body.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark", { themeIcon, themeToggleButton, themeLabel });
}

export function applyTheme(theme, { themeIcon, themeToggleButton, themeLabel }) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  writeString(STORAGE_KEYS.THEME_KEY, isDark ? "dark" : "light");

  if (themeIcon) {
    themeIcon.textContent = isDark ? "dark_mode" : "light_mode";
  }

  if (themeToggleButton) {
    themeToggleButton.setAttribute("aria-pressed", String(isDark));
  }

  if (themeLabel) {
    themeLabel.textContent = isDark ? "Dark" : "Light";
  }
}
