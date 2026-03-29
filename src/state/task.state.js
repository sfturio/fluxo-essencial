import { getAppState } from "./app.state.js";

export function getTasks() {
  return getAppState().tasks;
}

export function setTasks(nextTasks) {
  getAppState().tasks = nextTasks;
}

export function updateTaskById(taskId, updater) {
  const state = getAppState();
  const index = state.tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return null;
  }

  const current = state.tasks[index];
  const next = updater(current);
  state.tasks[index] = next;
  return next;
}
