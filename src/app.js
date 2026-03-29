import { KANBAN_PROMPT_TEMPLATE } from "../agents/kanban.prompt.js";
import { getAppState } from "./state/app.state.js";
import {
  getBoards,
  setBoards,
  getActiveBoardId,
  setActiveBoardId,
  getActiveBoard,
  getActiveColumns,
  getPrimaryColumnId,
  getFocusColumnId,
} from "./state/board.state.js";
import { getTasks, setTasks } from "./state/task.state.js";
import {
  STORAGE_KEYS,
  DEFAULT_BOARD_ID,
  readJson,
  writeJson,
  readString,
  writeString,
  taskStorageKey,
} from "./storage/local.storage.js";
import {
  loadBoards,
  saveBoards,
  loadActiveBoardId,
  saveActiveBoardId,
  createBoard,
  createColumn,
  normalizeBoardColumns,
} from "./services/board.service.js";
import {
  normalizeTaskForColumns,
  normalizeTasksForColumns,
  moveTask,
  moveTaskByDrop,
} from "./services/task.service.js";
import { gerarTasksIA } from "./services/planner.service.js";
import { parseTasks } from "./utils/parser.js";
import { normalizeSpaces, uid } from "./utils/helpers.js";
import { getDom } from "./ui/dom.js";
import {
  updateBoardName,
  renderBoardsPanel,
  renderColumnsPanel,
  renderBoardColumns,
  updateColumnTaskScrollLimits,
} from "./ui/board.render.js";
import {
  updatePageLock,
  closeSettingsMenu,
  toggleSettingsMenu,
  openAIPlanningModal,
  closeAIPlanningModal,
  openHelpModal,
  closeHelpModal,
  openTaskModal,
  closeTaskModal,
  readTaskModalData,
} from "./ui/modal.ui.js";
import { initTheme, toggleTheme, applyTheme } from "./features/theme.service.js";
import { initFocusMode, toggleFocusMode, applyFocusMode } from "./features/focus.service.js";
import { setupDropZones, clearDropIndicators } from "./features/dragdrop.service.js";
import { buildBackupPayload, applyBackupData } from "./features/backup.service.js";

const state = getAppState();
const dom = getDom();

boot();

function boot() {
  state.boards = loadBoards();
  state.activeBoardId = loadActiveBoardId(state.boards);
  state.tasks = loadTasksForBoard(state.activeBoardId).map((task) => normalizeTask(task));

  bindEvents();
  initTheme(dom);
  initFocusMode(dom);
  seedInitialSampleTasks();

  render();
}

function bindEvents() {
  dom.form?.addEventListener("submit", onCreateTask);

  dom.iaGenerateButton?.addEventListener("click", () => openAIPlanningModal(dom));
  dom.aiCancelButton?.addEventListener("click", () => closeAIPlanningModal(dom));
  dom.aiGenerateConfirmButton?.addEventListener("click", onGenerateIATasks);
  dom.aiCloseButton?.addEventListener("click", () => closeAIPlanningModal(dom));
  dom.aiModalOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.aiModalOverlay) closeAIPlanningModal(dom);
  });

  dom.taskModalClose?.addEventListener("click", () => closeTaskModal(dom));
  dom.taskModalCancel?.addEventListener("click", () => closeTaskModal(dom));
  dom.taskModalSave?.addEventListener("click", onSaveTaskModal);
  dom.taskModalOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.taskModalOverlay) closeTaskModal(dom);
  });

  dom.helpToggleButton?.addEventListener("click", () => openHelpModal(dom));
  dom.helpCloseButton?.addEventListener("click", () => closeHelpModal(dom));
  dom.helpModalOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.helpModalOverlay) closeHelpModal(dom);
  });
  dom.helpExportPromptButton?.addEventListener("click", onCopyPromptTemplate);

  dom.settingsToggleButton?.addEventListener("click", (event) => toggleSettingsMenu(dom, event));
  dom.boardToggleButton?.addEventListener("click", () => toggleBoardsPanel("tables"));
  dom.settingsColumnsToggleButton?.addEventListener("click", () => toggleBoardsPanel("columns"));
  dom.themeToggleButton?.addEventListener("click", () => toggleTheme(dom));
  dom.focusToggleButton?.addEventListener("click", () => toggleFocusMode(dom));

  dom.boardsCloseButton?.addEventListener("click", closeBoardsPanel);
  dom.boardsOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.boardsOverlay) closeBoardsPanel();
  });

  dom.createBoardButton?.addEventListener("click", onCreateBoard);
  dom.newBoardInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCreateBoard();
    }
  });

  dom.createColumnButton?.addEventListener("click", onCreateColumn);
  dom.newColumnInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCreateColumn();
    }
  });

  dom.exportBackupButton?.addEventListener("click", onExportBackup);
  dom.importBackupButton?.addEventListener("click", () => dom.backupFileInput?.click());
  dom.backupFileInput?.addEventListener("change", onBackupFileSelected);

  dom.boardsList?.addEventListener("click", onBoardsListClick);
  dom.columnsList?.addEventListener("click", onColumnsListClick);

  dom.boardElement?.addEventListener("click", onBoardClick);

  document.addEventListener("keydown", onGlobalKeydown);
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("visibilitychange", onVisibilityChange);

  dom.appRoot?.addEventListener("wheel", onAppWheel, { passive: false });
}

function loadTasksForBoard(boardId) {
  const key = taskStorageKey(boardId);
  const raw = localStorage.getItem(key);

  if (raw) {
    const parsed = readJson(key, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  if (boardId === DEFAULT_BOARD_ID) {
    const legacy = readJson(STORAGE_KEYS.LEGACY_STORAGE_KEY, []);
    if (Array.isArray(legacy) && legacy.length > 0) {
      writeJson(key, legacy);
      return legacy;
    }
  }

  return [];
}

function saveTasks() {
  writeJson(taskStorageKey(state.activeBoardId), state.tasks);
}

function normalizeTask(task) {
  return normalizeTaskForColumns(task, getActiveColumns());
}

function render() {
  const activeBoard = getActiveBoard();
  updateBoardName(dom.boardName, activeBoard);

  renderBoardsPanel({
    dom,
    state,
    boards: getBoards(),
    activeBoardId: getActiveBoardId(),
  });

  renderColumnsPanel({
    dom,
    state,
    activeColumns: getActiveColumns(),
  });

  renderBoardColumns({
    dom,
    state,
    tasks: getTasks(),
    activeColumns: getActiveColumns(),
    context: {
      ui: dom,
      state,
      getActiveColumns,
      actions: {
        onTaskAction,
        openTaskModal: onOpenTaskModal,
        clearDropIndicators: () => clearDropIndicators(dom.boardElement),
      },
    },
  });

  setupDropZones({
    boardElement: dom.boardElement,
    getDraggingTaskId: () => state.draggingTaskId,
    setDragOverListId: (value) => {
      state.dragOverListId = value;
    },
    clearDropIndicators,
    moveTaskByDrop: onMoveTaskByDrop,
  });

  applyFocusTargetColumn();
  updateClearColumnButtons();
}

function onTaskAction({ action, task, card, target }) {
  if (action === "left") {
    state.tasks = moveTask(state.tasks, task.id, -1, getActiveColumns());
    resetTaskTransientState();
    saveTasks();
    render();
    return;
  }

  if (action === "right") {
    state.tasks = moveTask(state.tasks, task.id, 1, getActiveColumns());
    resetTaskTransientState();
    saveTasks();
    render();
    return;
  }

  if (action === "toggle-comments") {
    state.commentsOpenTaskId = state.commentsOpenTaskId === task.id ? null : task.id;
    render();
    return;
  }

  if (action === "add-comment") {
    const assigneeInput = card.querySelector(".task-comment-assignee");
    const input = card.querySelector(".task-comment-input");
    if (!(input instanceof HTMLInputElement) || !(assigneeInput instanceof HTMLInputElement)) {
      return;
    }

    const text = normalizeSpaces(input.value);
    if (!text) {
      input.focus();
      return;
    }

    const assignee = normalizeSpaces(assigneeInput.value).replace(/^@+/, "");
    const selectedTask = state.tasks.find((item) => item.id === task.id);
    if (!selectedTask) {
      return;
    }

    if (!Array.isArray(selectedTask.comments)) {
      selectedTask.comments = [];
    }

    selectedTask.comments.push({
      id: uid(),
      text: assignee ? `${text} @${assignee}` : text,
      createdAt: new Date(),
    });

    state.commentsOpenTaskId = task.id;
    saveTasks();
    render();
    return;
  }

  if (action === "delete-comment") {
    const item = target.closest(".task-comment-item");
    const commentId = item?.getAttribute("data-comment-id");
    if (!commentId) return;

    const selectedTask = state.tasks.find((it) => it.id === task.id);
    if (!selectedTask || !Array.isArray(selectedTask.comments)) return;

    selectedTask.comments = selectedTask.comments.filter((comment) => String(comment.id) !== commentId);
    state.commentsOpenTaskId = task.id;
    saveTasks();
    render();
    return;
  }

  if (action === "edit") {
    state.deleteConfirmTaskId = null;
    state.editingTaskId = task.id;
    render();
    requestAnimationFrame(() => {
      const activeCard = document.querySelector(`.task[data-id="${task.id}"]`);
      const editInput = activeCard?.querySelector(".task-edit-input");
      editInput?.focus();
      editInput?.select();
    });
    return;
  }

  if (action === "confirm-edit") {
    const input = card.querySelector(".task-edit-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const nextTitle = normalizeSpaces(input.value);
    if (!nextTitle) {
      input.focus();
      return;
    }

    const selectedTask = state.tasks.find((item) => item.id === task.id);
    if (!selectedTask) {
      return;
    }

    selectedTask.title = nextTitle;
    state.editingTaskId = null;
    saveTasks();
    render();
    return;
  }

  if (action === "cancel-edit") {
    state.editingTaskId = null;
    render();
    return;
  }

  if (action === "delete") {
    state.editingTaskId = null;
    state.deleteConfirmTaskId = state.deleteConfirmTaskId === task.id ? null : task.id;
    render();
    return;
  }

  if (action === "confirm-delete") {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    resetTaskTransientState(task.id);
    saveTasks();
    render();
    return;
  }

  if (action === "cancel-delete") {
    state.deleteConfirmTaskId = null;
    render();
  }
}

function resetTaskTransientState(taskId = null) {
  if (!taskId || state.editingTaskId === taskId) state.editingTaskId = null;
  if (!taskId || state.deleteConfirmTaskId === taskId) state.deleteConfirmTaskId = null;
  if (!taskId || state.commentsOpenTaskId === taskId) state.commentsOpenTaskId = null;
}

function onOpenTaskModal(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }
  state.modalEditingTaskId = taskId;
  openTaskModal(dom, task);
}

function onSaveTaskModal() {
  if (!state.modalEditingTaskId) {
    return;
  }

  const task = state.tasks.find((item) => item.id === state.modalEditingTaskId);
  if (!task) {
    return;
  }

  const data = readTaskModalData(dom);
  if (!data.title) {
    dom.taskEditTitle?.focus();
    return;
  }

  Object.assign(task, data);

  saveTasks();
  render();
  state.modalEditingTaskId = null;
  closeTaskModal(dom);
}

function onMoveTaskByDrop(draggedId, targetColumnId, beforeTaskId) {
  state.tasks = moveTaskByDrop(state.tasks, draggedId, targetColumnId, beforeTaskId);
  resetTaskTransientState();
  saveTasks();
  render();
}

function onCreateTask(event) {
  event.preventDefault();

  const rawTitle = normalizeSpaces(dom.titleInput?.value || "");
  const rawDescription = normalizeSpaces(dom.descriptionInput?.value || "");

  if (!rawTitle) {
    dom.titleInput?.focus();
    return;
  }

  const parsed = parseTasks(rawTitle);
  const created = parsed.length > 0
    ? parsed
    : [{
        title: rawTitle,
        description: rawDescription,
        category: rawDescription ? rawDescription.toUpperCase() : null,
        assignee: null,
        tags: [],
        comments: [],
        deadline: null,
        completedAt: null,
        status: getPrimaryColumnId(),
        priority: "normal",
        createdAt: new Date(),
      }];

  const mapped = created.map((task) => normalizeTask({
    ...task,
    id: uid(),
    status: task.status || getPrimaryColumnId(),
  }));

  state.tasks = [...state.tasks, ...mapped];
  saveTasks();

  if (dom.form instanceof HTMLFormElement) {
    dom.form.reset();
  }
  dom.titleInput?.focus();

  render();
}

function onGenerateIATasks() {
  const input = normalizeSpaces(dom.aiPlanInput?.value || "");
  if (!input) {
    dom.aiPlanInput.value = "";
    dom.aiPlanInput.placeholder = "Descreva tarefas separadas por ;";
    dom.aiPlanInput.focus();
    return;
  }

  const generated = gerarTasksIA(input);
  if (generated.length === 0) {
    dom.aiPlanInput.focus();
    return;
  }

  const next = generated.map((task) => normalizeTask({
    ...task,
    id: uid(),
    status: task.status === "inprogress" ? getFocusColumnId() : getPrimaryColumnId(),
  }));

  state.tasks = [...state.tasks, ...next];
  saveTasks();
  closeAIPlanningModal(dom);
  dom.aiPlanInput.value = "";
  render();
}

function seedInitialSampleTasks() {
  if (readString(STORAGE_KEYS.INITIAL_SAMPLE_KEY, "") === "done") {
    return;
  }

  if (state.tasks.length > 0) {
    writeString(STORAGE_KEYS.INITIAL_SAMPLE_KEY, "done");
    return;
  }

  const sample = gerarTasksIA(
    "!!revisar fluxo de caixa (financeiro) @ana #financas #urgente +07042026; !organizar sprint semanal (manhã) @joao #backend #api +06042026; preparar campanha de leads (marketing) @bia #conteudo #social +08042026",
  );

  state.tasks = sample.map((task) => normalizeTask({
    ...task,
    id: uid(),
    status: task.status === "inprogress" ? getFocusColumnId() : getPrimaryColumnId(),
  }));

  saveTasks();
  writeString(STORAGE_KEYS.INITIAL_SAMPLE_KEY, "done");
}

function toggleBoardsPanel(mode = "tables") {
  closeSettingsMenu(dom);
  if (!dom.boardsOverlay) {
    return;
  }

  if (dom.boardsOverlay.hidden || state.boardsPanelMode !== mode) {
    openBoardsPanel(mode);
  } else {
    closeBoardsPanel();
  }
}

function openBoardsPanel(mode = "tables") {
  state.boardsPanelMode = mode === "columns" ? "columns" : "tables";
  applyBoardsPanelMode();
  dom.boardsOverlay.hidden = false;
  render();
  updatePageLock(dom);

  if (state.boardsPanelMode === "columns") {
    setTimeout(() => dom.newColumnInput?.focus(), 0);
  }
}

function closeBoardsPanel() {
  dom.boardsOverlay.hidden = true;
  state.editingBoardId = null;
  state.deleteConfirmBoardId = null;
  state.editingColumnId = null;
  state.deleteConfirmColumnId = null;
  updatePageLock(dom);
}

function applyBoardsPanelMode() {
  const showingColumns = state.boardsPanelMode === "columns";
  if (dom.boardsTitle) {
    dom.boardsTitle.textContent = showingColumns ? "Colunas" : "Tabelas";
  }
  if (dom.boardsTablesSection) dom.boardsTablesSection.hidden = showingColumns;
  if (dom.boardsColumnsSection) dom.boardsColumnsSection.hidden = !showingColumns;
  if (dom.boardsBackupSection) dom.boardsBackupSection.hidden = showingColumns;
}

function onCreateBoard() {
  const name = normalizeSpaces(dom.newBoardInput?.value || "");
  if (!name) {
    dom.newBoardInput?.focus();
    return;
  }

  state.boards.push(createBoard(name));
  saveBoards(state.boards);
  dom.newBoardInput.value = "";

  const next = state.boards[state.boards.length - 1];
  switchBoard(next.id);
  openBoardsPanel("tables");
}

function onCreateColumn() {
  const name = normalizeSpaces(dom.newColumnInput?.value || "");
  if (!name) {
    dom.newColumnInput?.focus();
    return;
  }

  const active = getActiveBoard();
  if (!active) {
    return;
  }

  const newCol = createColumn(name, active.columns);
  active.columns = [...normalizeBoardColumns(active.columns), newCol];
  saveBoards(state.boards);
  dom.newColumnInput.value = "";
  render();
}

function onBoardsListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const boardId = target.dataset.boardId;
  if (!action || !boardId) {
    return;
  }

  if (action === "switch-board") {
    switchBoard(boardId);
    return;
  }

  if (action === "edit-board") {
    state.editingBoardId = boardId;
    state.deleteConfirmBoardId = null;
    render();
    return;
  }

  if (action === "cancel-edit-board") {
    state.editingBoardId = null;
    render();
    return;
  }

  if (action === "confirm-edit-board") {
    const input = dom.boardsList.querySelector(`[data-board-name-input="${boardId}"]`);
    if (!(input instanceof HTMLInputElement)) return;

    const name = normalizeSpaces(input.value);
    if (!name) {
      input.focus();
      return;
    }

    const board = state.boards.find((item) => item.id === boardId);
    if (!board) return;
    board.name = name;
    state.editingBoardId = null;
    saveBoards(state.boards);
    render();
    return;
  }

  if (action === "delete-board") {
    state.editingBoardId = null;
    state.deleteConfirmBoardId = state.deleteConfirmBoardId === boardId ? null : boardId;
    render();
    return;
  }

  if (action === "cancel-delete-board") {
    state.deleteConfirmBoardId = null;
    render();
    return;
  }

  if (action === "confirm-delete-board") {
    deleteBoard(boardId);
  }
}

function onColumnsListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  const columnId = target.dataset.columnId;
  if (!action || !columnId) {
    return;
  }

  if (action === "edit-column") {
    state.editingColumnId = columnId;
    state.deleteConfirmColumnId = null;
    render();
    return;
  }

  if (action === "cancel-edit-column") {
    state.editingColumnId = null;
    render();
    return;
  }

  if (action === "confirm-edit-column") {
    const input = dom.columnsList.querySelector(`[data-column-name-input="${columnId}"]`);
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const name = normalizeSpaces(input.value);
    if (!name) {
      input.focus();
      return;
    }

    const board = getActiveBoard();
    if (!board) return;

    const column = board.columns.find((item) => item.id === columnId);
    if (!column) return;

    column.name = name;
    state.editingColumnId = null;
    saveBoards(state.boards);
    render();
    return;
  }

  if (action === "delete-column") {
    state.editingColumnId = null;
    state.deleteConfirmColumnId = state.deleteConfirmColumnId === columnId ? null : columnId;
    render();
    return;
  }

  if (action === "cancel-delete-column") {
    state.deleteConfirmColumnId = null;
    render();
    return;
  }

  if (action === "confirm-delete-column") {
    deleteColumn(columnId);
  }
}

function switchBoard(boardId) {
  const target = state.boards.find((board) => board.id === boardId);
  if (!target) {
    return;
  }

  state.activeBoardId = boardId;
  saveActiveBoardId(boardId);
  state.tasks = loadTasksForBoard(boardId).map((task) => normalizeTaskForColumns(task, target.columns));

  state.editingTaskId = null;
  state.deleteConfirmTaskId = null;
  state.commentsOpenTaskId = null;
  state.clearConfirmColumn = null;

  render();
}

function deleteBoard(boardId) {
  if (state.boards.length <= 1) {
    return;
  }

  const filtered = state.boards.filter((board) => board.id !== boardId);
  if (filtered.length === 0) {
    return;
  }

  state.boards = filtered;
  saveBoards(state.boards);

  if (state.activeBoardId === boardId) {
    state.activeBoardId = filtered[0].id;
    saveActiveBoardId(state.activeBoardId);
    state.tasks = loadTasksForBoard(state.activeBoardId).map((task) => normalizeTask(task));
  }

  state.deleteConfirmBoardId = null;
  state.editingBoardId = null;
  render();
}

function deleteColumn(columnId) {
  const board = getActiveBoard();
  if (!board || board.columns.length <= 1) {
    return;
  }

  const columns = [...board.columns];
  const index = columns.findIndex((column) => column.id === columnId);
  if (index === -1) {
    return;
  }

  const fallback = index > 0 ? columns[index - 1].id : columns[1]?.id;
  columns.splice(index, 1);

  state.tasks = state.tasks
    .filter((task) => task.status !== columnId)
    .map((task) => {
      if (!columns.some((column) => column.id === task.status)) {
        return { ...task, status: fallback || columns[0].id };
      }
      return task;
    });

  board.columns = columns;
  saveBoards(state.boards);
  saveTasks();

  state.deleteConfirmColumnId = null;
  state.editingColumnId = null;
  state.clearConfirmColumn = null;
  render();
}

function onBoardClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.action;
  if (action !== "clear-column") {
    return;
  }

  const column = target.dataset.column;
  if (!column) {
    return;
  }

  if (state.clearConfirmColumn === column) {
    state.tasks = state.tasks.filter((task) => task.status !== column);
    state.clearConfirmColumn = null;
    saveTasks();
    render();
    return;
  }

  state.clearConfirmColumn = column;
  updateClearColumnButtons();
}

function updateClearColumnButtons() {
  document.querySelectorAll(".clear-column-btn").forEach((button) => {
    const column = button.dataset.column;
    const isConfirming = state.clearConfirmColumn === column;
    button.classList.toggle("confirming", isConfirming);
    button.textContent = isConfirming ? "Confirmar" : "Limpar";
  });
}

function applyFocusTargetColumn() {
  const columns = getActiveColumns();
  const focusColumn = getFocusColumnId();
  const hasFocusColumn = columns.some((column) => column.id === focusColumn);
  if (!hasFocusColumn) {
    return;
  }

  document.querySelectorAll(".column").forEach((col) => {
    const isTarget = col.dataset.column === focusColumn;
    col.dataset.focusMain = isTarget ? "true" : "false";
  });
}

function onDocumentClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest(".settings-wrap")) {
    return;
  }

  closeSettingsMenu(dom);
}

function onGlobalKeydown(event) {
  if (event.key === "Escape") {
    if (document.body.classList.contains("focus-mode")) {
      applyFocusMode(false, dom);
      return;
    }

    if (!dom.aiModalOverlay.hidden) {
      closeAIPlanningModal(dom);
      return;
    }

    if (!dom.taskModalOverlay.hidden) {
      closeTaskModal(dom);
      return;
    }

    if (!dom.helpModalOverlay.hidden) {
      closeHelpModal(dom);
      return;
    }

    if (!dom.boardsOverlay.hidden) {
      closeBoardsPanel();
      return;
    }

    closeSettingsMenu(dom);
  }
}

function onVisibilityChange() {
  if (document.hidden) {
    closeSettingsMenu(dom);
  }
}

function onAppWheel(event) {
  if (!(event.target instanceof Element) || !dom.appMainScroll) {
    return;
  }

  const list = event.target.closest(".task-list.task-list-capped");
  if (list) {
    return;
  }

  event.preventDefault();
  dom.appMainScroll.scrollTop += event.deltaY;
}

function onCopyPromptTemplate() {
  navigator.clipboard
    .writeText(KANBAN_PROMPT_TEMPLATE)
    .then(() => {
      if (!dom.helpExportPromptButton) return;
      const original = dom.helpExportPromptButton.textContent;
      dom.helpExportPromptButton.textContent = "Copiado";
      setTimeout(() => {
        dom.helpExportPromptButton.textContent = original;
      }, 1200);
    })
    .catch(() => {
      if (!dom.helpExportPromptButton) return;
      dom.helpExportPromptButton.textContent = "Erro ao copiar";
      setTimeout(() => {
        dom.helpExportPromptButton.textContent = "Copiar prompt para IA";
      }, 1400);
    });
}

function onExportBackup() {
  saveTasks();

  const payload = buildBackupPayload({
    boards: state.boards,
    activeBoardId: state.activeBoardId,
    loadTasksForBoard,
    tasks: state.tasks,
    theme: document.body.classList.contains("dark") ? "dark" : "light",
    focusMode: document.body.classList.contains("focus-mode") ? "on" : "off",
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
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

    applyBackupData({
      data: parsed,
      setBoards: (nextBoards) => {
        state.boards = nextBoards;
        saveBoards(state.boards);
      },
      setActiveBoardId: (boardId) => {
        state.activeBoardId = boardId;
        saveActiveBoardId(boardId);
      },
      setTasks: (nextTasks) => {
        state.tasks = nextTasks.map((task) => normalizeTask(task));
        saveTasks();
      },
      applyTheme: (theme) => applyTheme(theme, dom),
      applyFocusMode: (on) => applyFocusMode(on, dom),
      loadTasksForBoard: (boardId) => {
        const board = state.boards.find((item) => item.id === boardId);
        const columns = board?.columns || getActiveColumns();
        return loadTasksForBoard(boardId).map((task) => normalizeTaskForColumns(task, columns));
      },
    });

    setBackupStatus("Backup importado.");
    render();
  } catch {
    setBackupStatus("Arquivo inválido.");
  } finally {
    target.value = "";
  }
}

function setBackupStatus(message) {
  if (!dom.backupStatus) {
    return;
  }

  dom.backupStatus.textContent = message;
  clearTimeout(setBackupStatus.timerId);
  setBackupStatus.timerId = setTimeout(() => {
    dom.backupStatus.textContent = "";
  }, 2200);
}
