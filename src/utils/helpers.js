export function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function inferCategory(description) {
  const base = normalizeSpaces(description).toLowerCase();
  if (!base) {
    return null;
  }

  if (base.includes("manhã") || base.includes("manha")) return "MANHÃ";
  if (base.includes("noite")) return "NOITE";
  if (base.includes("tarde")) return "TARDE";
  return null;
}

export function normalizeCategory(category, description) {
  const normalized = normalizeSpaces(category);
  if (normalized) {
    return normalized.toUpperCase();
  }

  return inferCategory(description);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeJsonParse(raw, fallback) {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
