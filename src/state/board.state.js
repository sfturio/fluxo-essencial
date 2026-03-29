import { getAppState } from "./app.state.js";

export function getBoards() {
  return getAppState().boards;
}

export function setBoards(nextBoards) {
  getAppState().boards = nextBoards;
}

export function getActiveBoardId() {
  return getAppState().activeBoardId;
}

export function setActiveBoardId(boardId) {
  getAppState().activeBoardId = boardId;
}

export function getActiveBoard() {
  const state = getAppState();
  return state.boards.find((board) => board.id === state.activeBoardId) || null;
}

export function getActiveColumns() {
  const active = getActiveBoard();
  return active?.columns || [];
}

export function getPrimaryColumnId() {
  return getActiveColumns()[0]?.id || "todo";
}

export function getFocusColumnId() {
  const columns = getActiveColumns();
  const inProgress = columns.find((column) => column.id === "inprogress");
  return (inProgress || columns[0] || { id: "todo" }).id;
}
