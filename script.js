const LEGACY_STORAGE_KEY = "kanban.tasks.v1";
const TASKS_KEY_PREFIX = "kanban.tasks.board.v2.";
const BOARDS_KEY = "kanban.boards.v1";
const ACTIVE_BOARD_KEY = "kanban.active-board.v1";
const THEME_KEY = "kanban.theme.v1";
const FOCUS_KEY = "kanban.focus.v1";
const DEFAULT_COLUMNS = [
  { id: "todo", name: "Próximos" },
  { id: "inprogress", name: "Em andamento" },
  { id: "done", name: "Concluído" },
];
const DEFAULT_BOARD_ID = "principal";

let boards = loadBoards();
let activeBoardId = loadActiveBoardId();
let tasks = loadTasksForBoard(activeBoardId).map(normalizeTask);
let draggingTaskId = null;
let dragOverListId = null;
let editingTaskId = null;
let modalEditingTaskId = null;
let deleteConfirmTaskId = null;
let commentsOpenTaskId = null;
let editingBoardId = null;
let deleteConfirmBoardId = null;
let editingColumnId = null;
let deleteConfirmColumnId = null;
let clearConfirmColumn = null;
let boardsPanelMode = "tables";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const boardName = document.getElementById("board-name");
const helpToggleButton = document.getElementById("help-toggle");
const helpModalOverlay = document.getElementById("help-modal-overlay");
const helpCloseButton = document.getElementById("help-close-btn");
const helpExportPromptButton = document.getElementById("help-export-prompt-btn");

const settingsToggleButton = document.getElementById("settings-toggle");
const settingsMenu = document.getElementById("settings-menu");
const settingsColumnsToggleButton = document.getElementById("settings-columns-toggle");
const boardToggleButton = document.getElementById("board-toggle");
const boardsOverlay = document.getElementById("boards-overlay");
const boardsTitle = document.getElementById("boards-title");
const boardsTablesSection = document.getElementById("boards-tables-section");
const boardsColumnsSection = document.getElementById("boards-columns-section");
const boardsBackupSection = document.getElementById("boards-backup-section");
const boardsCloseButton = document.getElementById("boards-close");
const boardsList = document.getElementById("boards-list");
const newBoardInput = document.getElementById("new-board-input");
const createBoardButton = document.getElementById("create-board-btn");
const columnsList = document.getElementById("columns-list");
const newColumnInput = document.getElementById("new-column-input");
const createColumnButton = document.getElementById("create-column-btn");
const exportBackupButton = document.getElementById("export-backup-btn");
const importBackupButton = document.getElementById("import-backup-btn");
const backupFileInput = document.getElementById("backup-file-input");
const backupStatus = document.getElementById("backup-status");

const iaGenerateButton = document.getElementById("ia-generate-btn");
const aiModalOverlay = document.getElementById("ai-modal-overlay");
const aiPlanInput = document.getElementById("ai-plan-input");
const aiCancelButton = document.getElementById("ai-cancel-btn");
const aiGenerateConfirmButton = document.getElementById("ai-generate-confirm-btn");
const aiCloseButton = document.getElementById("ai-close-btn");
const taskModalOverlay = document.getElementById("task-modal-overlay");
const taskModalClose = document.getElementById("task-modal-close");
const taskModalCancel = document.getElementById("task-modal-cancel");
const taskModalSave = document.getElementById("task-modal-save");
const taskEditTitle = document.getElementById("task-edit-title");
const taskEditCategory = document.getElementById("task-edit-category");
const taskEditAssignee = document.getElementById("task-edit-assignee");
const taskEditTags = document.getElementById("task-edit-tags");
const taskEditDeadline = document.getElementById("task-edit-deadline");
const taskEditCompletedAt = document.getElementById("task-edit-completed-at");
const taskEditPriority = document.getElementById("task-edit-priority");

const themeToggleButton = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");
const focusToggleButton = document.getElementById("focus-toggle");
const focusLabel = document.getElementById("focus-label");
const boardElement = document.querySelector(".board");

form.addEventListener("submit", onCreateTask);
iaGenerateButton?.addEventListener("click", openAIPlanningModal);
aiCancelButton?.addEventListener("click", closeAIPlanningModal);
aiGenerateConfirmButton?.addEventListener("click", onGenerateIATasks);
aiCloseButton?.addEventListener("click", closeAIPlanningModal);
aiModalOverlay?.addEventListener("click", onModalOverlayClick);
taskModalClose?.addEventListener("click", closeTaskModal);
taskModalCancel?.addEventListener("click", closeTaskModal);
taskModalSave?.addEventListener("click", saveTaskModal);
taskModalOverlay?.addEventListener("click", onTaskModalOverlayClick);

boardToggleButton?.addEventListener("click", toggleBoardsPanel);
settingsColumnsToggleButton?.addEventListener("click", openColumnsManager);
boardsCloseButton?.addEventListener("click", closeBoardsPanel);
boardsOverlay?.addEventListener("click", onBoardsOverlayClick);
createBoardButton?.addEventListener("click", onCreateBoard);
newBoardInput?.addEventListener("keydown", onNewBoardInputKeydown);
createColumnButton?.addEventListener("click", onCreateColumn);
newColumnInput?.addEventListener("keydown", onNewColumnInputKeydown);
exportBackupButton?.addEventListener("click", onExportBackup);
importBackupButton?.addEventListener("click", onImportBackupClick);
backupFileInput?.addEventListener("change", onBackupFileSelected);

boardsList?.addEventListener("click", onBoardsListClick);
boardsList?.addEventListener("keydown", onBoardsListKeydown);
columnsList?.addEventListener("click", onColumnsListClick);
columnsList?.addEventListener("keydown", onColumnsListKeydown);
boardElement?.addEventListener("click", onBoardClick);

document.addEventListener("keydown", onGlobalKeydown);
document.addEventListener("visibilitychange", onVisibilityChange);

themeToggleButton?.addEventListener("click", toggleTheme);
settingsToggleButton?.addEventListener("click", toggleSettingsMenu);
document.addEventListener("click", onDocumentClick);
focusToggleButton?.addEventListener("click", toggleFocusMode);
helpToggleButton?.addEventListener("click", toggleHelpSection);
helpCloseButton?.addEventListener("click", closeHelpModal);
helpExportPromptButton?.addEventListener("click", onCopyPromptTemplate);
helpModalOverlay?.addEventListener("click", onHelpOverlayClick);

initTheme();
initFocusMode();
updateBoardName();
renderBoardsPanel();
updateClearColumnButtons();
render();

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const theme = stored || "dark";
  applyTheme(theme);
}

function toggleTheme() {
  const isDark = document.body.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

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

function initFocusMode() {
  const stored = localStorage.getItem(FOCUS_KEY) === "on";
  applyFocusMode(stored);
}

function toggleFocusMode() {
  const isOn = document.body.classList.contains("focus-mode");
  applyFocusMode(!isOn);
}

function applyFocusMode(on) {
  document.body.classList.toggle("focus-mode", on);
  localStorage.setItem(FOCUS_KEY, on ? "on" : "off");

  if (focusToggleButton) {
    focusToggleButton.classList.toggle("active", on);
    focusToggleButton.setAttribute("aria-pressed", String(on));
    focusToggleButton.setAttribute(
      "aria-label",
      on ? "Desativar modo foco" : "Ativar modo foco",
    );

    if (on) {
      focusToggleButton.classList.remove("pulse");
      void focusToggleButton.offsetWidth;
      focusToggleButton.classList.add("pulse");
    }
  }

  if (focusLabel) {
    focusLabel.textContent = on ? "Sair do foco" : "Modo Foco";
  }
}

function loadBoards() {
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];

    const normalized = list
      .map(normalizeBoard)
      .filter((item) => item.id && item.name);

    if (normalized.length === 0) {
      return [normalizeBoard({ id: DEFAULT_BOARD_ID, name: "Principal", columns: DEFAULT_COLUMNS })];
    }

    return normalized;
  } catch {
    return [normalizeBoard({ id: DEFAULT_BOARD_ID, name: "Principal", columns: DEFAULT_COLUMNS })];
  }
}

function saveBoards() {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

function loadActiveBoardId() {
  const stored = localStorage.getItem(ACTIVE_BOARD_KEY);
  const valid = boards.find((board) => board.id === stored);
  const active = valid ? valid.id : boards[0].id;
  localStorage.setItem(ACTIVE_BOARD_KEY, active);
  return active;
}

function setActiveBoardId(boardId) {
  activeBoardId = boardId;
  localStorage.setItem(ACTIVE_BOARD_KEY, boardId);
}

function taskStorageKey(boardId) {
  return `${TASKS_KEY_PREFIX}${boardId}`;
}

function loadTasksForBoard(boardId) {
  try {
    const key = taskStorageKey(boardId);
    const raw = localStorage.getItem(key);

    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }

    if (boardId === DEFAULT_BOARD_ID) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const legacyTasks = Array.isArray(legacyParsed) ? legacyParsed : [];
        localStorage.setItem(key, JSON.stringify(legacyTasks));
        return legacyTasks;
      }
    }

    return [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(taskStorageKey(activeBoardId), JSON.stringify(tasks));
}

function normalizeTask(task) {
  return normalizeTaskForColumns(task, getActiveColumns());
}

function normalizeTaskForColumns(task, columns) {
  const normalizedColumns = normalizeBoardColumns(columns);
  const validStatuses = new Set(normalizedColumns.map((column) => column.id));
  const fallbackStatus = normalizedColumns[0]?.id || "todo";
  return {
    id: task.id || crypto.randomUUID(),
    title: String(task.title || "").trim(),
    description: String(task.description || ""),
    category: normalizeCategory(task.category, task.description),
    assignee: typeof task.assignee === "string" ? task.assignee.trim() : null,
    tags: Array.isArray(task.tags) ? task.tags.filter(Boolean) : [],
    comments: normalizeTaskComments(task.comments),
    deadline: normalizeDeadline(task.deadline),
    completedAt: normalizeDeadline(task.completedAt),
    status: validStatuses.has(task.status) ? task.status : fallbackStatus,
    priority: task.priority === "high" ? "high" : "normal",
    createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
  };
}

function updateBoardName() {
  const active = boards.find((board) => board.id === activeBoardId);
  if (boardName) {
    boardName.textContent = active ? active.name : "Principal";
  }
}

function toggleBoardsPanel() {
  closeSettingsMenu();
  if (!boardsOverlay) {
    return;
  }

  if (boardsOverlay.hidden || boardsPanelMode !== "tables") {
    openBoardsPanel("tables");
  } else {
    closeBoardsPanel();
  }
}

function openBoardsPanel(mode = "tables") {
  if (!boardsOverlay) {
    return;
  }

  boardsPanelMode = mode === "columns" ? "columns" : "tables";
  applyBoardsPanelMode();
  renderBoardsPanel();
  boardsOverlay.hidden = false;

  updatePageLock();
}

function openColumnsManager() {
  closeSettingsMenu();
  openBoardsPanel("columns");
  window.setTimeout(() => newColumnInput?.focus(), 0);
}

function applyBoardsPanelMode() {
  const showingColumns = boardsPanelMode === "columns";

  if (boardsTitle) {
    boardsTitle.textContent = showingColumns ? "Colunas" : "Tabelas";
  }
  if (boardsTablesSection) {
    boardsTablesSection.hidden = showingColumns;
  }
  if (boardsColumnsSection) {
    boardsColumnsSection.hidden = !showingColumns;
  }
  if (boardsBackupSection) {
    boardsBackupSection.hidden = showingColumns;
  }
}

function closeBoardsPanel() {
  if (!boardsOverlay) {
    return;
  }

  boardsOverlay.hidden = true;
  editingBoardId = null;
  deleteConfirmBoardId = null;
  editingColumnId = null;
  deleteConfirmColumnId = null;

  updatePageLock();
}

function toggleSettingsMenu(event) {
  event?.stopPropagation();
  if (!settingsMenu || !settingsToggleButton) {
    return;
  }

  const isHidden = settingsMenu.hidden;
  settingsMenu.hidden = !isHidden;
  settingsToggleButton.setAttribute("aria-expanded", String(isHidden));
}

function closeSettingsMenu() {
  if (!settingsMenu || !settingsToggleButton) {
    return;
  }

  settingsMenu.hidden = true;
  settingsToggleButton.setAttribute("aria-expanded", "false");
}

function onDocumentClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest(".settings-wrap")) {
    return;
  }

  closeSettingsMenu();
}

function onBoardsOverlayClick(event) {
  if (event.target === boardsOverlay) {
    closeBoardsPanel();
  }
}

function onCreateBoard() {
  const name = (newBoardInput?.value || "").trim();
  if (!name) {
    newBoardInput?.focus();
    return;
  }

  const board = {
    id: crypto.randomUUID(),
    name,
    columns: DEFAULT_COLUMNS.map((column) => ({ ...column })),
  };

  boards.push(board);
  saveBoards();

  if (newBoardInput) {
    newBoardInput.value = "";
  }

  switchBoard(board.id);
  openBoardsPanel();
}

function onExportBackup() {
  saveTasks();

  const payload = buildBackupPayload();
  const content = JSON.stringify(payload, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");
  const filename = `fluxo-essencial-backup-${stamp}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setBackupStatus("Backup exportado.");
}

function onImportBackupClick() {
  backupFileInput?.click();
}

async function onBackupFileSelected(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const file = target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyBackupData(parsed);
    setBackupStatus("Backup importado.");
  } catch {
    setBackupStatus("Arquivo inválido.");
  } finally {
    target.value = "";
  }
}

function buildBackupPayload() {
  const tasksByBoard = {};

  boards.forEach((board) => {
    const boardTasks = loadTasksForBoard(board.id).map(normalizeTask);
    tasksByBoard[board.id] = boardTasks;
  });

  tasksByBoard[activeBoardId] = tasks.map(normalizeTask);

  return {
    app: "fluxo-essencial",
    version: 1,
    exportedAt: new Date().toISOString(),
    boards,
    activeBoardId,
    tasksByBoard,
    settings: {
      theme: document.body.classList.contains("dark") ? "dark" : "light",
      focusMode: document.body.classList.contains("focus-mode") ? "on" : "off",
    },
  };
}

function applyBackupData(data) {
  const importedBoards = Array.isArray(data?.boards)
    ? data.boards.map(normalizeBoard).filter((item) => item.id && item.name)
    : [];

  if (importedBoards.length === 0) {
    throw new Error("invalid backup");
  }

  const importedTasksByBoard =
    data && typeof data.tasksByBoard === "object" && data.tasksByBoard
      ? data.tasksByBoard
      : {};

  const nextActiveBoardId = importedBoards.some((board) => board.id === data?.activeBoardId)
    ? data.activeBoardId
    : importedBoards[0].id;

  const taskKeysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(TASKS_KEY_PREFIX)) {
      taskKeysToRemove.push(key);
    }
  }
  taskKeysToRemove.forEach((key) => localStorage.removeItem(key));

  importedBoards.forEach((board) => {
    const rawTasks = Array.isArray(importedTasksByBoard[board.id])
      ? importedTasksByBoard[board.id]
      : [];
    const normalized = rawTasks.map((task) => normalizeTaskForColumns(task, board.columns));
    localStorage.setItem(taskStorageKey(board.id), JSON.stringify(normalized));
  });

  boards = importedBoards;
  saveBoards();
  setActiveBoardId(nextActiveBoardId);
  tasks = loadTasksForBoard(nextActiveBoardId).map(normalizeTask);
  editingTaskId = null;
  deleteConfirmTaskId = null;
  editingBoardId = null;
  deleteConfirmBoardId = null;
  editingColumnId = null;
  deleteConfirmColumnId = null;
  clearConfirmColumn = null;
  updateClearColumnButtons();

  const theme = data?.settings?.theme;
  if (theme === "dark" || theme === "light") {
    applyTheme(theme);
  }

  const focus = data?.settings?.focusMode;
  if (focus === "on" || focus === "off") {
    applyFocusMode(focus === "on");
  }

  updateBoardName();
  renderBoardsPanel();
  render();
}

function setBackupStatus(message) {
  if (!backupStatus) {
    return;
  }

  backupStatus.textContent = message;
  window.clearTimeout(setBackupStatus.timerId);
  setBackupStatus.timerId = window.setTimeout(() => {
    backupStatus.textContent = "";
  }, 2200);
}

function onNewBoardInputKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onCreateBoard();
  }
}

function onNewColumnInputKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onCreateColumn();
  }
}

function onCreateColumn() {
  const name = normalizeSpaces(newColumnInput?.value || "");
  if (!name) {
    newColumnInput?.focus();
    return;
  }

  const active = getActiveBoard();
  if (!active) {
    return;
  }

  const existingIds = new Set((active.columns || []).map((column) => column.id));
  let baseId = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!baseId) {
    baseId = `col-${(active.columns || []).length + 1}`;
  }

  let nextId = baseId;
  let suffix = 2;
  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const nextColumns = [...normalizeBoardColumns(active.columns), { id: nextId, name }];
  active.columns = nextColumns;
  saveBoards();

  if (newColumnInput) {
    newColumnInput.value = "";
  }

  renderBoardsPanel();
  render();
}

function renderBoardsPanel() {
  if (!boardsList) {
    return;
  }

  boardsList.innerHTML = "";

  boards.forEach((board) => {
    const wrapper = document.createElement("div");
    wrapper.className = `board-item${board.id === activeBoardId ? " active-table" : ""}`;
    wrapper.dataset.id = board.id;

    const isActive = board.id === activeBoardId;
    const isEditing = board.id === editingBoardId;
    const isDeleteConfirm = board.id === deleteConfirmBoardId;

    if (isEditing) {
      wrapper.innerHTML = `
        <div class="board-edit-row">
          <input type="text" class="board-edit-input" value="${escapeHtml(board.name)}" maxlength="60" />
          <button type="button" data-action="confirm-rename">Salvar</button>
          <button type="button" data-action="cancel-rename">Cancelar</button>
        </div>
      `;
    } else {
      wrapper.innerHTML = `
        <button type="button" class="board-select${isActive ? " active" : ""}" data-action="select">${escapeHtml(board.name)}</button>
        <div class="board-actions">
          <button type="button" data-action="rename">Renomear</button>
          <button type="button" data-action="delete">Excluir</button>
        </div>
      `;
    }

    if (isDeleteConfirm) {
      const confirm = document.createElement("div");
      confirm.className = "board-delete-confirm";
      confirm.innerHTML = `
        <button type="button" class="danger" data-action="confirm-delete-board">Confirmar</button>
        <button type="button" data-action="cancel-delete-board">Cancelar</button>
      `;
      wrapper.appendChild(confirm);
    }

    boardsList.appendChild(wrapper);

    if (isEditing) {
      const input = wrapper.querySelector(".board-edit-input");
      input?.focus();
      input?.select();
    }
  });

  renderColumnsPanel();
}

function renderColumnsPanel() {
  if (!columnsList) {
    return;
  }

  const active = getActiveBoard();
  const columns = getActiveColumns();

  columnsList.innerHTML = "";

  columns.forEach((column) => {
    const row = document.createElement("div");
    row.className = "board-item";
    row.dataset.columnId = column.id;

    const isEditing = editingColumnId === column.id;
    const isConfirmingDelete = deleteConfirmColumnId === column.id;
    const isLocked = columns.length <= 1;

    if (isEditing) {
      row.innerHTML = `
        <div class="board-edit-row">
          <input type="text" class="column-edit-input" value="${escapeHtml(column.name)}" maxlength="40" />
          <button type="button" data-action="confirm-rename-column">Salvar</button>
          <button type="button" data-action="cancel-rename-column">Cancelar</button>
        </div>
      `;
    } else {
      row.innerHTML = `
        <button type="button" class="board-select active" data-action="noop">${escapeHtml(column.name)}</button>
        <div class="board-actions">
          <button type="button" data-action="rename-column">Renomear</button>
          <button type="button" data-action="delete-column"${isLocked ? " disabled" : ""}>Excluir</button>
        </div>
      `;
    }

    if (isConfirmingDelete && !isLocked) {
      const tasksInColumn = tasks.filter((task) => task.status === column.id).length;
      const warningText =
        tasksInColumn > 0
          ? `Excluir coluna e ${tasksInColumn} tarefa${tasksInColumn > 1 ? "s" : ""}?`
          : "Excluir coluna?";
      const confirm = document.createElement("div");
      confirm.className = "board-delete-confirm";
      confirm.innerHTML = `
        <span>${escapeHtml(warningText)}</span>
        <button type="button" class="danger" data-action="confirm-delete-column">Confirmar</button>
        <button type="button" data-action="cancel-delete-column">Cancelar</button>
      `;
      row.appendChild(confirm);
    }

    columnsList.appendChild(row);

    if (isEditing) {
      const input = row.querySelector(".column-edit-input");
      input?.focus();
      input?.select();
    }
  });
}

function onBoardsListClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const actionElement = target.closest("[data-action]");
  if (!(actionElement instanceof HTMLElement)) {
    return;
  }

  const action = actionElement.dataset.action;
  if (!action) {
    return;
  }

  const item = actionElement.closest(".board-item");
  const boardId = item?.dataset.id;
  if (!boardId) {
    return;
  }

  if (action === "select") {
    switchBoard(boardId);
    closeBoardsPanel();
    return;
  }

  if (action === "rename") {
    deleteConfirmBoardId = null;
    editingBoardId = boardId;
    renderBoardsPanel();
    return;
  }

  if (action === "cancel-rename") {
    editingBoardId = null;
    renderBoardsPanel();
    return;
  }

  if (action === "confirm-rename") {
    const input = item.querySelector(".board-edit-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const nextName = input.value.trim();
    if (!nextName) {
      input.focus();
      return;
    }

    const board = boards.find((entry) => entry.id === boardId);
    if (!board) {
      return;
    }

    board.name = nextName;
    editingBoardId = null;
    saveBoards();
    updateBoardName();
    renderBoardsPanel();
    return;
  }

  if (action === "delete") {
    if (boards.length <= 1) {
      return;
    }

    editingBoardId = null;
    deleteConfirmBoardId = deleteConfirmBoardId === boardId ? null : boardId;
    renderBoardsPanel();
    return;
  }

  if (action === "cancel-delete-board") {
    deleteConfirmBoardId = null;
    renderBoardsPanel();
    return;
  }

  if (action === "confirm-delete-board") {
    deleteBoard(boardId);
  }
}

function onBoardsListKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("board-edit-input")) {
    event.preventDefault();
    const row = target.closest(".board-item");
    const confirmButton = row?.querySelector('[data-action="confirm-rename"]');
    confirmButton?.click();
  }
}

function deleteBoard(boardId) {
  if (boards.length <= 1) {
    return;
  }

  const deletingActive = boardId === activeBoardId;
  boards = boards.filter((board) => board.id !== boardId);
  saveBoards();

  localStorage.removeItem(taskStorageKey(boardId));

  if (deletingActive) {
    const fallback = boards[0];
    switchBoard(fallback.id, { persistCurrentBoard: false });
  } else {
    renderBoardsPanel();
  }

  deleteConfirmBoardId = null;
  editingBoardId = null;
  deleteConfirmColumnId = null;
  editingColumnId = null;
  renderBoardsPanel();
}

function switchBoard(boardId, options = {}) {
  const { persistCurrentBoard = true } = options;

  if (boardId === activeBoardId) {
    updateBoardName();
    renderBoardsPanel();
    return;
  }

  if (persistCurrentBoard) {
    saveTasks();
  }

  setActiveBoardId(boardId);
  tasks = loadTasksForBoard(boardId).map(normalizeTask);
  editingTaskId = null;
  deleteConfirmTaskId = null;
  commentsOpenTaskId = null;
  editingColumnId = null;
  deleteConfirmColumnId = null;
  clearConfirmColumn = null;

  updateBoardName();
  renderBoardsPanel();
  render();
}

function onCreateTask(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  const parsed = parseTasks(title);

  if (parsed.length > 0) {
    const fallbackCategory = inferCategory(description);
    const enriched = parsed.map((task) => {
      if (!fallbackCategory || task.category) {
        return task;
      }

      return {
        ...task,
        description: fallbackCategory,
        category: fallbackCategory,
      };
    });

    tasks.push(...enriched);
  } else {
    tasks.push({
      id: crypto.randomUUID(),
      title,
      description,
      category: inferCategory(description),
      assignee: null,
      tags: [],
      comments: [],
      deadline: null,
      completedAt: null,
      status: getPrimaryColumnId(),
      priority: "normal",
      createdAt: new Date(),
    });
  }

  form.reset();
  titleInput.focus();
  saveTasks();
  render();
}

function onGenerateIATasks() {
  const text = normalizeSpaces(aiPlanInput?.value || "");
  const shouldUseExamples = text.length === 0 && tasks.length === 0;
  const planText = shouldUseExamples ? getExamplePlanInput() : text;

  if (!planText) {
    return;
  }

  const generatedCount = gerarTasksIA(planText);
  if (generatedCount === 0) {
    return;
  }

  if (aiPlanInput) {
    aiPlanInput.value = "";
  }

  closeAIPlanningModal();
}

function getExamplePlanInput() {
  return [
    "!organizar sprint semanal (manhã) @joao #backend #api +06-04-2026",
    "!!revisar fluxo de caixa (financeiro) @ana #financas #urgente +07-04-2026",
    "preparar campanha de leads (marketing) @bia #conteudo #social +08-04-2026",
  ].join("; ");
}

function normalizeBoard(board) {
  return {
    id: String(board?.id || "").trim(),
    name: String(board?.name || "").trim(),
    columns: normalizeBoardColumns(board?.columns),
  };
}

function normalizeTaskComments(comments) {
  if (!Array.isArray(comments)) {
    return [];
  }

  return comments
    .map((comment) => {
      if (typeof comment === "string") {
        const text = normalizeSpaces(comment);
        return text ? { id: crypto.randomUUID(), text, createdAt: new Date() } : null;
      }

      const text = normalizeSpaces(comment?.text || "");
      if (!text) {
        return null;
      }

      return {
        id: String(comment?.id || crypto.randomUUID()),
        text,
        createdAt: comment?.createdAt ? new Date(comment.createdAt) : new Date(),
      };
    })
    .filter(Boolean);
}

function normalizeBoardColumns(columns) {
  const source = Array.isArray(columns) ? columns : DEFAULT_COLUMNS;
  const used = new Set();
  const normalized = source
    .map((column, index) => {
      const fallbackId = index < DEFAULT_COLUMNS.length ? DEFAULT_COLUMNS[index].id : `col-${index + 1}`;
      const fallbackName = index < DEFAULT_COLUMNS.length ? DEFAULT_COLUMNS[index].name : `Coluna ${index + 1}`;
      const rawId = String(column?.id || fallbackId).trim().toLowerCase();
      const id = rawId.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallbackId;
      const uniqueId = used.has(id) ? `${id}-${index + 1}` : id;
      used.add(uniqueId);
      const name = normalizeSpaces(column?.name || fallbackName) || fallbackName;
      return { id: uniqueId, name };
    })
    .filter((column) => column.id && column.name);

  return normalized.length > 0 ? normalized : DEFAULT_COLUMNS.map((column) => ({ ...column }));
}

function getActiveBoard() {
  return boards.find((board) => board.id === activeBoardId) || boards[0] || null;
}

function getActiveColumns() {
  const active = getActiveBoard();
  return normalizeBoardColumns(active?.columns);
}

function getPrimaryColumnId() {
  const columns = getActiveColumns();
  return columns[0]?.id || DEFAULT_COLUMNS[0].id;
}

function getFocusColumnId() {
  const columns = getActiveColumns();
  return columns.find((column) => column.id === "inprogress")?.id || columns[1]?.id || columns[0]?.id;
}

function gerarTasksIA(text) {
  const plannedTasks = parseTasks(text);

  if (plannedTasks.length === 0) {
    return 0;
  }

  tasks = [...plannedTasks, ...tasks];
  saveTasks();
  render();

  console.log("Planejando com IA:", plannedTasks);
  return plannedTasks.length;
}

function parseTasks(input) {
  const columns = getActiveColumns();
  const firstStatus = columns[0]?.id || "todo";
  const focusStatus = getFocusColumnId();
  const rawItems = String(input || "")
    .split(";")
    .map((item) => normalizeSpaces(item))
    .filter((item) => item.length > 0);

  return rawItems
    .map(parseTaskItem)
    .filter((task) => task.title.length > 0)
    .map((task) => ({
      id: crypto.randomUUID(),
      title: task.title,
      description: task.category || "",
      category: task.category,
      assignee: task.assignee,
      tags: task.tags,
      comments: [],
      deadline: task.deadline,
      completedAt: null,
      status: task.column === "em_andamento" ? focusStatus : firstStatus,
      priority: task.priority,
      createdAt: task.createdAt,
    }));
}

function parseTaskItem(rawText) {
  const trimmed = normalizeSpaces(rawText);
  if (!trimmed) {
    return {
      title: "",
      column: "proximos",
      category: null,
      assignee: null,
      tags: [],
      deadline: null,
      priority: "normal",
      createdAt: new Date(),
    };
  }

  const priorityMatch = trimmed.match(/^!+/);
  const priorityCount = priorityMatch ? priorityMatch[0].length : 0;
  let withoutPriority = trimmed.replace(/^!+/, "").trim();

  let category = null;
  let baseText = withoutPriority;
  const categoryMatch = baseText.match(/\(([^)]+)\)/);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    baseText = baseText
      .replace(categoryMatch[0], " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const assigneeMatch = baseText.match(/@\s*([^\s#\+]+)/);
  const assignee = assigneeMatch ? assigneeMatch[1].trim() : null;

  const tags = [];
  const tagMatches = baseText.match(/#\s*([^\s@+\#]+)/g) || [];
  tagMatches.forEach((match) => {
    const value = normalizeSpaces(match.slice(1));
    if (value && !tags.includes(value)) {
      tags.push(value);
    }
  });

  const deadlineMatch = baseText.match(/\+\s*([^\s@#\+]+)/);
  const deadline = deadlineMatch ? normalizeDeadline(deadlineMatch[1]) : null;

  let title = baseText
    .replace(/@\s*([^\s#\+]+)/g, "")
    .replace(/#\s*([^\s@+\#]+)/g, "")
    .replace(/\+\s*([^\s@#\+]+)/g, "");
  title = normalizeSpaces(title);

  const isPriority = priorityCount >= 1;
  const isHighPriority = priorityCount >= 2;
  const priority = isHighPriority ? "high" : "normal";

  return {
    title,
    column: isPriority && !isHighPriority ? "em_andamento" : "proximos",
    category: category && category.length > 0 ? category : null,
    assignee,
    tags,
    deadline,
    priority,
    createdAt: new Date(),
  };
}

function normalizeSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeDeadline(value) {
  const raw = normalizeSpaces(value);
  if (!raw) {
    return null;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    if (/^\d{4}/.test(digits)) {
      const maybeYear = Number(digits.slice(0, 4));
      const maybeMonth = Number(digits.slice(4, 6));
      const maybeDay = Number(digits.slice(6, 8));
      if (isValidDateParts(maybeDay, maybeMonth, maybeYear)) {
        return formatDateParts(maybeDay, maybeMonth, maybeYear);
      }
    }

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    if (isValidDateParts(day, month, year)) {
      return formatDateParts(day, month, year);
    }
  }

  if (digits.length === 6) {
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const shortYear = Number(digits.slice(4, 6));
    const year = shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear;
    if (isValidDateParts(day, month, year)) {
      return formatDateParts(day, month, year);
    }
  }

  const parts = raw
    .split(/[^0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length >= 3) {
    const [first, second, third] = parts;
    if (/^\d+$/.test(first) && /^\d+$/.test(second) && /^\d+$/.test(third)) {
      let day = Number(first);
      let month = Number(second);
      let year = Number(third);

      if (first.length === 4) {
        year = Number(first);
        month = Number(second);
        day = Number(third);
      } else if (third.length === 2) {
        const shortYear = Number(third);
        year = shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear;
      }

      if (isValidDateParts(day, month, year)) {
        return formatDateParts(day, month, year);
      }
    }
  }

  return null;
}

function isValidDateParts(day, month, year) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateParts(day, month, year) {
  const dayText = String(day).padStart(2, "0");
  const monthText = String(month).padStart(2, "0");
  const yearText = String(year).padStart(4, "0");
  return `${dayText}-${monthText}-${yearText}`;
}

function openAIPlanningModal() {
  if (!aiModalOverlay) {
    return;
  }

  aiModalOverlay.hidden = false;
  updatePageLock();
  aiPlanInput?.focus();
}

function closeAIPlanningModal() {
  if (aiModalOverlay) {
    aiModalOverlay.hidden = true;
  }

  updatePageLock();
}

function onModalOverlayClick(event) {
  if (event.target === aiModalOverlay) {
    closeAIPlanningModal();
  }
}

function onGlobalKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  closeSettingsMenu();

  if (aiModalOverlay && !aiModalOverlay.hidden) {
    closeAIPlanningModal();
    return;
  }

  if (taskModalOverlay && !taskModalOverlay.hidden) {
    closeTaskModal();
    return;
  }

  if (helpModalOverlay && !helpModalOverlay.hidden) {
    closeHelpModal();
    return;
  }

  if (boardsOverlay && !boardsOverlay.hidden) {
    closeBoardsPanel();
    return;
  }

  if (clearConfirmColumn) {
    clearConfirmColumn = null;
    updateClearColumnButtons();
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    return;
  }

  closeSettingsMenu();
  closeAIPlanningModal();
  closeTaskModal();
  closeHelpModal();
  closeBoardsPanel();
  clearConfirmColumn = null;
  updateClearColumnButtons();
}

function updatePageLock() {
  const aiOpen = aiModalOverlay && !aiModalOverlay.hidden;
  const boardsOpen = boardsOverlay && !boardsOverlay.hidden;
  const helpOpen = helpModalOverlay && !helpModalOverlay.hidden;
  const taskOpen = taskModalOverlay && !taskModalOverlay.hidden;
  document.body.style.overflow = aiOpen || boardsOpen || helpOpen || taskOpen ? "hidden" : "";
}

function toggleHelpSection() {
  if (!helpModalOverlay || !helpToggleButton) {
    return;
  }

  if (helpModalOverlay.hidden) {
    openHelpModal();
  } else {
    closeHelpModal();
  }
}

function openHelpModal() {
  if (!helpModalOverlay || !helpToggleButton) {
    return;
  }

  helpModalOverlay.hidden = false;
  helpToggleButton.setAttribute("aria-expanded", "true");
  updatePageLock();
}

function closeHelpModal() {
  if (!helpModalOverlay || !helpToggleButton) {
    return;
  }

  helpModalOverlay.hidden = true;
  helpToggleButton.setAttribute("aria-expanded", "false");
  updatePageLock();
}

function onHelpOverlayClick(event) {
  if (event.target === helpModalOverlay) {
    closeHelpModal();
  }
}

function onColumnsListClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const actionElement = target.closest("[data-action]");
  if (!(actionElement instanceof HTMLElement)) {
    return;
  }

  const action = actionElement.dataset.action;
  if (!action || action === "noop") {
    return;
  }

  const item = actionElement.closest("[data-column-id]");
  const columnId = item?.dataset.columnId;
  if (!columnId) {
    return;
  }

  const active = getActiveBoard();
  if (!active) {
    return;
  }

  const columns = getActiveColumns();
  const lockedDelete = columns.length <= 1;

  if (action === "rename-column") {
    deleteConfirmColumnId = null;
    editingColumnId = columnId;
    renderBoardsPanel();
    return;
  }

  if (action === "cancel-rename-column") {
    editingColumnId = null;
    renderBoardsPanel();
    return;
  }

  if (action === "confirm-rename-column") {
    const input = item.querySelector(".column-edit-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const nextName = normalizeSpaces(input.value || "");
    if (!nextName) {
      input.focus();
      return;
    }

    const nextColumns = columns.map((column) =>
      column.id === columnId ? { ...column, name: nextName } : column,
    );

    active.columns = nextColumns;
    editingColumnId = null;
    saveBoards();
    renderBoardsPanel();
    render();
    return;
  }

  if (action === "delete-column") {
    if (lockedDelete) {
      return;
    }
    editingColumnId = null;
    deleteConfirmColumnId = deleteConfirmColumnId === columnId ? null : columnId;
    renderBoardsPanel();
    return;
  }

  if (action === "cancel-delete-column") {
    deleteConfirmColumnId = null;
    renderBoardsPanel();
    return;
  }

  if (action === "confirm-delete-column") {
    if (lockedDelete) {
      return;
    }
    deleteColumn(columnId);
  }
}

function onColumnsListKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("column-edit-input")) {
    event.preventDefault();
    const row = target.closest("[data-column-id]");
    const confirmButton = row?.querySelector('[data-action="confirm-rename-column"]');
    confirmButton?.click();
  }
}

function deleteColumn(columnId) {
  const active = getActiveBoard();
  if (!active) {
    return;
  }

  const columns = getActiveColumns();
  const nextColumns = columns.filter((column) => column.id !== columnId);
  if (nextColumns.length === 0) {
    return;
  }

  tasks = tasks.filter((task) => task.status !== columnId);

  active.columns = nextColumns;
  editingColumnId = null;
  deleteConfirmColumnId = null;
  clearConfirmColumn = null;
  saveBoards();
  saveTasks();
  renderBoardsPanel();
  render();
}

async function onCopyPromptTemplate() {
  const content = `Transforme a ideia abaixo em tarefas acionáveis para Kanban.

Regras:
- Separe tarefas usando ";"
- Comece com verbos (criar, implementar, corrigir, adicionar)
- Use:
  ! = mover para "Em andamento"
  !! = alta prioridade
  ( ) = categoria
  @ = responsável
  # = tags
  + = data (DD-MM-AAAA)
- Mantenha tarefas curtas
- Sem explicações

Exemplo:
!criar API (manhã) @joao #backend +05-04-2026

Ideia:
Quero organizar minha semana para avançar no produto, melhorar a captação de clientes e manter consistência de saúde.
`;
  const button = helpExportPromptButton;
  if (!button) {
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    const originalLabel = button.textContent || "Copiar prompt para IA";
    button.textContent = "Copiado!";
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.disabled = false;
    }, 1200);
  } catch {
    // Fallback: mantém o prompt selecionável via prompt nativo
    window.prompt("Copie o prompt:", content);
  }
}

function inferCategory(description) {
  const value = String(description || "").trim();
  return value;
}

function normalizeCategory(category, description) {
  if (typeof category === "string") {
    const value = category.trim();
    return value.length > 0 ? value : null;
  }

  const fromDescription = inferCategory(description || "");
  return fromDescription.length > 0 ? fromDescription : null;
}

function onBoardClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const clearButton = target.closest('[data-action="clear-column"]');
  if (!(clearButton instanceof HTMLElement)) {
    return;
  }

  const column = clearButton.dataset.column;
  onClearColumnClick(column);
}

function onClearColumnClick(column) {
  const validColumns = new Set(getActiveColumns().map((entry) => entry.id));
  if (!column || !validColumns.has(column)) {
    return;
  }

  if (clearConfirmColumn === column) {
    clearConfirmColumn = null;
    clearColumnTasks(column);
    updateClearColumnButtons();
    return;
  }

  clearConfirmColumn = column;
  updateClearColumnButtons();
}

function clearColumnTasks(column) {
  const previousCount = tasks.length;
  tasks = tasks.filter((task) => task.status !== column);

  if (tasks.length === previousCount) {
    return;
  }

  editingTaskId = null;
  deleteConfirmTaskId = null;
  saveTasks();
  render();
}

function updateClearColumnButtons() {
  document.querySelectorAll('[data-action="clear-column"]').forEach((button) => {
    const column = button.dataset.column;
    const isConfirming = clearConfirmColumn === column;
    button.classList.toggle("confirming", isConfirming);
    button.textContent = isConfirming ? "Confirmar" : "Limpar";
  });
}

function render() {
  renderBoardColumns();

  const columns = getActiveColumns();
  const fallbackStatus = columns[0]?.id || "todo";
  const validStatuses = new Set(columns.map((column) => column.id));
  let changed = false;

  tasks = tasks.map((task) => {
    if (validStatuses.has(task.status)) {
      return task;
    }
    changed = true;
    return { ...task, status: fallbackStatus };
  });

  if (changed) {
    saveTasks();
  }

  columns.forEach((column) => {
    const list = document.getElementById(`${column.id}-list`);
    if (!list) {
      return;
    }

    list.innerHTML = "";

    const columnTasks = tasks.filter((task) => task.status === column.id);
    const orderedTasks = orderTasksForColumn(columnTasks);

    orderedTasks.forEach((task) => list.appendChild(createTaskElement(task)));
  });

  setupDropZones();
  updateClearColumnButtons();
}

function renderBoardColumns() {
  if (!boardElement) {
    return;
  }

  const columns = getActiveColumns();
  const focusColumnId = getFocusColumnId();

  boardElement.innerHTML = columns
    .map((column) => {
      const isFocusMain = column.id === focusColumnId;
      return `
        <article class="column" data-column="${escapeHtml(column.id)}" data-focus-main="${isFocusMain ? "true" : "false"}">
          <div class="column-head">
            <h2>${escapeHtml(column.name)}</h2>
            <button type="button" class="clear-column-btn" data-action="clear-column" data-column="${escapeHtml(column.id)}">Limpar</button>
          </div>
          <div class="task-list" id="${escapeHtml(column.id)}-list"></div>
        </article>
      `;
    })
    .join("");
}

function orderTasksForColumn(columnTasks) {
  return [...columnTasks]
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aHigh = a.task.priority === "high";
      const bHigh = b.task.priority === "high";

      if (aHigh !== bHigh) {
        return aHigh ? -1 : 1;
      }

      if (aHigh && bHigh) {
        const aCreated = getTaskCreatedAtTimestamp(a.task);
        const bCreated = getTaskCreatedAtTimestamp(b.task);
        if (aCreated !== bCreated) {
          return aCreated - bCreated;
        }
      }

      return a.index - b.index;
    })
    .map((entry) => entry.task);
}

function getTaskCreatedAtTimestamp(task) {
  if (task.createdAt instanceof Date) {
    const time = task.createdAt.getTime();
    return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
  }

  const parsed = new Date(task.createdAt);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function createTaskElement(task) {
  const card = document.createElement("article");
  const columns = getActiveColumns();
  const lastColumnId = columns[columns.length - 1]?.id;
  const priorityClass = task.priority === "high" ? " priority-high" : task.priority === "medium" ? " priority-medium" : "";
  card.className = `task${task.status === lastColumnId ? " done" : ""}${priorityClass}`;
  card.draggable = true;
  card.dataset.id = task.id;

  const isEditing = editingTaskId === task.id;
  const isDeleteConfirming = deleteConfirmTaskId === task.id;

  card.innerHTML = `
    <div class="task-main"></div>
    <div class="task-actions">
      <button type="button" data-action="left">←</button>
      <button type="button" data-action="right">→</button>
      <button type="button" class="comment" data-action="toggle-comments" aria-label="Comentários">🗨</button>
      <button type="button" data-action="edit">Renomear</button>
      <button type="button" class="delete" data-action="delete">Excluir</button>
    </div>
    <div class="task-delete-confirm${isDeleteConfirming ? " show" : ""}">
      <span>Excluir tarefa?</span>
      <button type="button" class="danger" data-action="confirm-delete">Confirmar</button>
      <button type="button" data-action="cancel-delete">Cancelar</button>
    </div>
  `;

  const main = card.querySelector(".task-main");
  if (isEditing) {
    main.innerHTML = `
      <div class="task-edit-row">
        <input type="text" class="task-edit-input" value="${escapeHtml(task.title)}" maxlength="120" />
        <button type="button" data-action="confirm-edit">Salvar</button>
        <button type="button" data-action="cancel-edit">Cancelar</button>
      </div>
    `;
  } else {
    main.innerHTML = `
      <button type="button" class="task-title-btn" aria-label="Editar tarefa">
        <p class="task-title"></p>
      </button>
    `;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    let hasMeta = false;

    if (task.category) {
      const category = document.createElement("span");
      category.className = "task-chip task-category";
      category.textContent = task.category;
      meta.appendChild(category);
      hasMeta = true;
    }

    if (task.assignee) {
      const assignee = document.createElement("span");
      assignee.className = "task-chip task-assignee";
      assignee.textContent = `@${task.assignee}`;
      meta.appendChild(assignee);
      hasMeta = true;
    }

    if (Array.isArray(task.tags) && task.tags.length > 0) {
      task.tags.forEach((tag) => {
        const normalizedTag = normalizeSpaces(tag);
        if (!normalizedTag) {
          return;
        }

        const tagElement = document.createElement("span");
        tagElement.className = "task-chip task-tag";
        tagElement.textContent = `#${normalizedTag}`;
        meta.appendChild(tagElement);
        hasMeta = true;
      });
    }

    if (task.deadline) {
      const deadline = document.createElement("span");
      deadline.className = "task-chip task-deadline";
      deadline.textContent = task.deadline;
      meta.appendChild(deadline);
      hasMeta = true;
    }

    if (task.completedAt) {
      const completedAt = document.createElement("span");
      completedAt.className = "task-chip task-completed-date";
      completedAt.textContent = `Finalizado em ${task.completedAt}`;
      meta.appendChild(completedAt);
      hasMeta = true;
    }

    if (hasMeta) {
      main.appendChild(meta);
    }

    const comments = Array.isArray(task.comments) ? task.comments : [];
    const isCommentsOpen = commentsOpenTaskId === task.id;
    const commentsWrap = document.createElement("div");
    commentsWrap.className = `task-comments${isCommentsOpen ? " open" : ""}`;

    if (comments.length > 0) {
      const list = document.createElement("div");
      list.className = "task-comments-list";
      comments.forEach((comment) => {
        const item = document.createElement("p");
        item.className = "task-comment-item";
        appendCommentTextWithMentions(item, comment.text);
        list.appendChild(item);
      });
      commentsWrap.appendChild(list);
    } else {
      const empty = document.createElement("p");
      empty.className = "task-comment-empty";
      empty.textContent = "Sem comentários";
      commentsWrap.appendChild(empty);
    }

    const commentForm = document.createElement("div");
    commentForm.className = "task-comment-form";
    commentForm.innerHTML = `
      <div class="task-comment-input-wrap">
        <input type="text" class="task-comment-input" maxlength="180" placeholder="comentário" />
        <span class="task-comment-prefix">@</span>
        <input type="text" class="task-comment-assignee" maxlength="40" placeholder="nome" />
      </div>
      <button type="button" data-action="add-comment">Adicionar</button>
    `;
    commentsWrap.appendChild(commentForm);
    main.appendChild(commentsWrap);
  }

  const title = card.querySelector(".task-title");
  if (title) {
    title.textContent = task.title;
  }

  const leftButton = card.querySelector('[data-action="left"]');
  const rightButton = card.querySelector('[data-action="right"]');

  const columnOrder = getActiveColumns();
  const firstColumnId = columnOrder[0]?.id;
  const terminalColumnId = columnOrder[columnOrder.length - 1]?.id;
  leftButton.disabled = task.status === firstColumnId;
  rightButton.disabled = task.status === terminalColumnId;

  card.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === "left") {
      moveTask(task.id, -1);
      return;
    }

    if (action === "right") {
      moveTask(task.id, 1);
      return;
    }

    if (action === "edit") {
      deleteConfirmTaskId = null;
      editingTaskId = task.id;
      render();
      requestAnimationFrame(() => {
        const activeCard = document.querySelector(`.task[data-id="${task.id}"]`);
        const editInput = activeCard?.querySelector(".task-edit-input");
        editInput?.focus();
        editInput?.select();
      });
      return;
    }

    if (action === "toggle-comments") {
      commentsOpenTaskId = commentsOpenTaskId === task.id ? null : task.id;
      render();
      return;
    }

    if (action === "add-comment") {
      const assigneeInput = card.querySelector(".task-comment-assignee");
      const input = card.querySelector(".task-comment-input");
      if (!(input instanceof HTMLInputElement) || !(assigneeInput instanceof HTMLInputElement)) {
        return;
      }

      const text = normalizeSpaces(input.value || "");
      if (!text) {
        input.focus();
        return;
      }
      const assignee = normalizeSpaces(assigneeInput.value || "").replace(/^@+/, "");

      const selectedTask = tasks.find((item) => item.id === task.id);
      if (!selectedTask) {
        return;
      }

      if (!Array.isArray(selectedTask.comments)) {
        selectedTask.comments = [];
      }

      selectedTask.comments.push({
        id: crypto.randomUUID(),
        text: assignee ? `${text} @${assignee}` : text,
        createdAt: new Date(),
      });

      commentsOpenTaskId = task.id;
      saveTasks();
      render();
      return;
    }


    if (action === "confirm-edit") {
      const input = card.querySelector(".task-edit-input");
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const nextTitle = input.value.trim();
      if (!nextTitle) {
        input.focus();
        return;
      }

      const selectedTask = tasks.find((item) => item.id === task.id);
      if (!selectedTask) {
        return;
      }

      selectedTask.title = nextTitle;
      editingTaskId = null;
      saveTasks();
      render();
      return;
    }

    if (action === "cancel-edit") {
      editingTaskId = null;
      render();
      return;
    }

    if (action === "delete") {
      editingTaskId = null;
      const confirmBox = card.querySelector(".task-delete-confirm");
      if (!(confirmBox instanceof HTMLElement)) {
        return;
      }

      if (deleteConfirmTaskId === task.id) {
        deleteConfirmTaskId = null;
        confirmBox.classList.remove("show");
        return;
      }

      closeAllTaskDeleteConfirms();
      deleteConfirmTaskId = task.id;
      confirmBox.classList.add("show");
      return;
    }

    if (action === "confirm-delete") {
      deleteTask(task.id);
      return;
    }

    if (action === "cancel-delete") {
      deleteConfirmTaskId = null;
      const confirmBox = card.querySelector(".task-delete-confirm");
      if (confirmBox instanceof HTMLElement) {
        confirmBox.classList.remove("show");
      }
    }
  });

  const titleButton = card.querySelector(".task-title-btn");
  titleButton?.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    openTaskModal(task.id);
  });

  card.addEventListener("dragstart", (event) => {
    draggingTaskId = task.id;
    card.classList.add("dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", task.id);
    }
  });

  card.addEventListener("dragend", () => {
    draggingTaskId = null;
    dragOverListId = null;
    card.classList.remove("dragging");
    clearDropIndicators();
  });

  card.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".task-actions")) {
      return;
    }
    openTaskModal(task.id);
  });

  const commentInput = card.querySelector(".task-comment-input");
  const commentAssigneeInput = card.querySelector(".task-comment-assignee");
  const onCommentEnter = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const addButton = card.querySelector('[data-action="add-comment"]');
      if (addButton instanceof HTMLElement) {
        addButton.click();
      }
    }
  };

  commentInput?.addEventListener("keydown", onCommentEnter);
  commentAssigneeInput?.addEventListener("keydown", onCommentEnter);

  return card;
}

function appendCommentTextWithMentions(container, text) {
  const source = String(text || "");
  const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(source)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
    }

    const mention = document.createElement("span");
    mention.className = "task-comment-mention";
    mention.textContent = match[1];
    container.appendChild(mention);

    lastIndex = mentionRegex.lastIndex;
  }

  if (lastIndex < source.length) {
    container.appendChild(document.createTextNode(source.slice(lastIndex)));
  }
}

function moveTask(taskId, direction) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  const columns = getActiveColumns().map((column) => column.id);
  const index = columns.indexOf(task.status);
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= columns.length) {
    return;
  }

  task.status = columns[nextIndex];
  editingTaskId = null;
  deleteConfirmTaskId = null;
  saveTasks();
  render();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  if (editingTaskId === taskId) {
    editingTaskId = null;
  }
  if (deleteConfirmTaskId === taskId) {
    deleteConfirmTaskId = null;
  }
  if (commentsOpenTaskId === taskId) {
    commentsOpenTaskId = null;
  }
  saveTasks();
  render();
}

function closeAllTaskDeleteConfirms() {
  document.querySelectorAll(".task-delete-confirm.show").forEach((element) => {
    element.classList.remove("show");
  });
}

function openTaskModal(taskId) {
  if (!taskModalOverlay) {
    return;
  }

  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  modalEditingTaskId = taskId;
  if (taskEditTitle) {
    taskEditTitle.value = task.title || "";
  }
  if (taskEditCategory) {
    taskEditCategory.value = task.category || "";
  }
  if (taskEditAssignee) {
    taskEditAssignee.value = task.assignee || "";
  }
  if (taskEditTags) {
    taskEditTags.value = Array.isArray(task.tags) ? task.tags.join(", ") : "";
  }
  if (taskEditDeadline) {
    taskEditDeadline.value = task.deadline || "";
  }
  if (taskEditCompletedAt) {
    taskEditCompletedAt.value = task.completedAt || "";
  }
  if (taskEditPriority) {
    taskEditPriority.value = task.priority || "normal";
  }

  taskModalOverlay.hidden = false;
  updatePageLock();
  taskEditTitle?.focus();
}

function closeTaskModal() {
  if (!taskModalOverlay) {
    return;
  }

  taskModalOverlay.hidden = true;
  modalEditingTaskId = null;
  updatePageLock();
}

function onTaskModalOverlayClick(event) {
  if (event.target === taskModalOverlay) {
    closeTaskModal();
  }
}

function saveTaskModal() {
  if (!modalEditingTaskId) {
    return;
  }

  const task = tasks.find((item) => item.id === modalEditingTaskId);
  if (!task) {
    return;
  }

  const nextTitle = taskEditTitle?.value.trim() || "";
  if (!nextTitle) {
    taskEditTitle?.focus();
    return;
  }

  task.title = nextTitle;
  task.category = (taskEditCategory?.value || "").trim() || null;
  task.assignee = (taskEditAssignee?.value || "").trim() || null;
  const tags = (taskEditTags?.value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  task.tags = tags;
  task.deadline = normalizeDeadline(taskEditDeadline?.value || "");
  task.completedAt = normalizeDeadline(taskEditCompletedAt?.value || "");
  task.priority = taskEditPriority?.value || "normal";

  saveTasks();
  render();
  closeTaskModal();
}

function setupDropZones() {
  document.querySelectorAll(".column").forEach((columnElement) => {
    const taskList = columnElement.querySelector(".task-list");
    const column = columnElement.dataset.column;
    if (!(taskList instanceof HTMLElement) || !column) {
      return;
    }

    columnElement.addEventListener("dragover", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest(".task-list")) {
        return;
      }

      event.preventDefault();
      dragOverListId = taskList.id;
      taskList.classList.add("drag-over", "drop-at-end");
      taskList.dataset.dropBeforeId = "";
    });

    columnElement.addEventListener("drop", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest(".task-list")) {
        return;
      }

      event.preventDefault();
      taskList.classList.remove("drag-over", "drop-at-end");

      const draggedId = draggingTaskId || event.dataTransfer?.getData("text/plain");
      if (!draggedId) {
        return;
      }

      moveTaskByDrop(draggedId, column, null);
      clearDropIndicators();
    });

    taskList.addEventListener("dragover", (event) => {
      event.preventDefault();
      dragOverListId = taskList.id;
      taskList.classList.add("drag-over");
      updateDropIndicator(taskList, event.clientY);
    });

    taskList.addEventListener("dragleave", (event) => {
      const related = event.relatedTarget;
      if (related instanceof Node && taskList.contains(related)) {
        return;
      }

      if (dragOverListId === taskList.id) {
        dragOverListId = null;
      }

      taskList.classList.remove("drag-over");
      taskList.classList.remove("drop-at-end");
      taskList.dataset.dropBeforeId = "";
      clearCardIndicators(taskList);
    });

    taskList.addEventListener("drop", (event) => {
      event.preventDefault();
      taskList.classList.remove("drag-over");
      taskList.classList.remove("drop-at-end");

      const draggedId = draggingTaskId || event.dataTransfer?.getData("text/plain");
      if (!draggedId) {
        return;
      }

      const beforeTaskId = taskList.dataset.dropBeforeId || null;

      moveTaskByDrop(draggedId, column, beforeTaskId);
      clearDropIndicators();
    });
  });
}

function updateDropIndicator(taskList, cursorY) {
  const cards = Array.from(taskList.querySelectorAll(".task:not(.dragging)"));
  const nextCard = cards.find((card) => {
    const rect = card.getBoundingClientRect();
    return cursorY <= rect.top + rect.height / 2;
  });

  clearCardIndicators(taskList);
  taskList.classList.remove("drop-at-end");

  if (nextCard) {
    nextCard.classList.add("drop-indicator");
    taskList.dataset.dropBeforeId = nextCard.dataset.id || "";
    return;
  }

  taskList.dataset.dropBeforeId = "";
  taskList.classList.add("drop-at-end");
}

function clearCardIndicators(taskList) {
  taskList.querySelectorAll(".task.drop-indicator").forEach((card) => {
    card.classList.remove("drop-indicator");
  });
}

function clearDropIndicators() {
  document.querySelectorAll(".task-list").forEach((list) => {
    list.classList.remove("drag-over", "drop-at-end");
    list.dataset.dropBeforeId = "";
    clearCardIndicators(list);
  });
}

function moveTaskByDrop(taskId, targetColumn, beforeTaskId) {
  const draggedTask = tasks.find((task) => task.id === taskId);
  if (!draggedTask) {
    return;
  }

  if (beforeTaskId && beforeTaskId === taskId) {
    return;
  }

  const remaining = tasks.filter((task) => task.id !== taskId);
  const updatedTask = { ...draggedTask, status: targetColumn };

  let insertIndex = -1;

  if (beforeTaskId) {
    insertIndex = remaining.findIndex((task) => task.id === beforeTaskId);
  }

  if (insertIndex === -1) {
    insertIndex = lastIndexOfStatus(remaining, targetColumn) + 1;
    if (insertIndex < 0) {
      insertIndex = remaining.length;
    }
  }

  remaining.splice(insertIndex, 0, updatedTask);
  tasks = remaining;
  editingTaskId = null;
  deleteConfirmTaskId = null;
  saveTasks();
  render();
}

function lastIndexOfStatus(list, status) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].status === status) {
      return i;
    }
  }
  return -1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
