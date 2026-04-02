import { normalizeDeadline } from "./date.js";
import { normalizeCategory, normalizeSpaces } from "./helpers.js";

const DEFAULT_COLUMN_NAMES = ["Próximos", "Em andamento", "Concluído"];

function toComparable(value) {
  return normalizeSpaces(value).toLowerCase();
}

function buildKnownColumns(columnNames) {
  const merged = [...DEFAULT_COLUMN_NAMES, ...(Array.isArray(columnNames) ? columnNames : [])]
    .map((name) => normalizeSpaces(name))
    .filter(Boolean);

  const seen = new Set();
  return merged
    .map((name) => ({ raw: name, normalized: toComparable(name) }))
    .filter((entry) => {
      if (!entry.normalized || seen.has(entry.normalized)) return false;
      seen.add(entry.normalized);
      return true;
    })
    .sort((a, b) => b.normalized.length - a.normalized.length);
}

function extractColumnAndTitle(afterMarker, columnNames) {
  const text = normalizeSpaces(afterMarker);
  if (!text) {
    return { columnName: null, titlePart: "" };
  }

  const comparable = toComparable(text);
  const knownColumns = buildKnownColumns(columnNames);

  const match = knownColumns.find((entry) => {
    if (!comparable.startsWith(entry.normalized)) return false;
    return comparable.length === entry.normalized.length || comparable[entry.normalized.length] === " ";
  });

  if (match) {
    return {
      columnName: match.raw,
      titlePart: normalizeSpaces(text.slice(match.raw.length)),
    };
  }

  const [firstToken, ...rest] = text.split(" ");
  return {
    columnName: normalizeSpaces(firstToken),
    titlePart: normalizeSpaces(rest.join(" ")),
  };
}

function parseTaskItem(rawText, options = {}) {
  let text = normalizeSpaces(rawText);
  if (!text) {
    return null;
  }

  let priority = "normal";
  let columnName = null;

  if (text.startsWith("!")) {
    priority = "high";
    text = normalizeSpaces(text.slice(1));
  }

  if (text.startsWith(">")) {
    const extracted = extractColumnAndTitle(text.slice(1), options.columnNames);
    columnName = extracted.columnName;
    text = extracted.titlePart;
  }

  const categoryMatch = text.match(/\(([^)]+)\)/);
  const category = categoryMatch ? normalizeCategory(categoryMatch[1], "") : null;
  if (categoryMatch) {
    text = normalizeSpaces(text.replace(categoryMatch[0], " "));
  }

  const assigneeMatch = text.match(/@([\wÀ-ÖØ-öø-ÿ.-]+)/u);
  const assignee = assigneeMatch ? normalizeSpaces(assigneeMatch[1]) : null;
  if (assigneeMatch) {
    text = normalizeSpaces(text.replace(assigneeMatch[0], " "));
  }

  const tags = [];
  text = text.replace(/#([\wÀ-ÖØ-öø-ÿ.-]+)/gu, (_, tag) => {
    const next = normalizeSpaces(tag);
    if (next) {
      tags.push(next);
    }
    return " ";
  });

  let deadline = null;
  text = text.replace(/[+*]([0-9./\-]{4,12})/g, (_, rawDate) => {
    const normalized = normalizeDeadline(rawDate);
    if (normalized) {
      deadline = normalized;
    }
    return " ";
  });

  const title = normalizeSpaces(text);
  if (!title) {
    return null;
  }

  return {
    title,
    description: "",
    category,
    assignee,
    tags,
    comments: [],
    deadline,
    completedAt: null,
    columnName,
    priority,
    createdAt: new Date(),
  };
}

export function parseTasks(input, options = {}) {
  return String(input || "")
    .split(";")
    .map((item) => parseTaskItem(item, options))
    .filter(Boolean);
}

export function gerarTasksIA(text) {
  return parseTasks(text);
}

export function getExamplePlanInput() {
  return ">em andamento organizar sprint semanal (manhã) @joao #backend #api +06042026; !revisar fluxo de caixa (financeiro) @ana #financas #urgente +07042026; >próximos preparar campanha de leads (marketing) @bia #conteudo #social +08042026";
}
