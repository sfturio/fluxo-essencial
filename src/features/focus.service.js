import { STORAGE_KEYS, readString, writeString } from "../storage/local.storage.js";

export function initFocusMode({ focusToggleButton, focusLabel }) {
  // Hotfix: nunca iniciar em modo foco para não bloquear controles na carga.
  applyFocusMode(false, { focusToggleButton, focusLabel });
}

export function toggleFocusMode({ focusToggleButton, focusLabel }) {
  const isOn = document.body.classList.contains("focus-mode");
  applyFocusMode(!isOn, { focusToggleButton, focusLabel });
}

export function applyFocusMode(on, { focusToggleButton, focusLabel }) {
  document.body.classList.toggle("focus-mode", on);
  writeString(STORAGE_KEYS.FOCUS_KEY, on ? "on" : "off");

  if (focusToggleButton) {
    focusToggleButton.classList.toggle("active", on);
    focusToggleButton.setAttribute("aria-pressed", String(on));
    focusToggleButton.setAttribute("aria-label", on ? "Desativar modo foco" : "Ativar modo foco");
  }

  if (focusLabel) {
    focusLabel.textContent = on ? "Sair do foco" : "Modo Foco";
  }
}
