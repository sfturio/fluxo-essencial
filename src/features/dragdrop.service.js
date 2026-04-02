export function setupDropZones({
  boardElement,
  getDraggingTaskId,
  setDragOverListId,
  clearDropIndicators,
  moveTaskByDrop,
}) {
  boardElement?.querySelectorAll(".column").forEach((columnElement) => {
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
      setDragOverListId(taskList.id);
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
      const draggedId = getDraggingTaskId() || event.dataTransfer?.getData("text/plain");
      if (!draggedId || draggedId.startsWith("column:")) {
        return;
      }

      moveTaskByDrop(draggedId, column, null);
      clearDropIndicators(boardElement);
    });

    taskList.addEventListener("dragover", (event) => {
      event.preventDefault();
      setDragOverListId(taskList.id);
      taskList.classList.add("drag-over");
      updateDropIndicator(taskList, event.clientY);
    });

    taskList.addEventListener("dragleave", (event) => {
      const related = event.relatedTarget;
      if (related instanceof Node && taskList.contains(related)) {
        return;
      }

      setDragOverListId(null);
      taskList.classList.remove("drag-over", "drop-at-end");
      taskList.dataset.dropBeforeId = "";
      clearCardIndicators(taskList);
    });

    taskList.addEventListener("drop", (event) => {
      event.preventDefault();
      taskList.classList.remove("drag-over", "drop-at-end");

      const draggedId = getDraggingTaskId() || event.dataTransfer?.getData("text/plain");
      if (!draggedId || draggedId.startsWith("column:")) {
        return;
      }

      const beforeTaskId = taskList.dataset.dropBeforeId || null;
      moveTaskByDrop(draggedId, column, beforeTaskId);
      clearDropIndicators(boardElement);
    });
  });
}

export function setupColumnDropZones({
  boardElement,
  getDraggingColumnId,
  setDraggingColumnId,
  moveColumnByDrop,
}) {
  const columns = Array.from(boardElement?.querySelectorAll(".column") || []);

  columns.forEach((columnElement) => {
    const columnId = columnElement.dataset.column;
    const columnHead = columnElement.querySelector(".column-head");
    if (!columnId || !(columnHead instanceof HTMLElement)) {
      return;
    }

    columnHead.classList.add("column-drag-handle");
    columnHead.draggable = true;

    columnHead.addEventListener("dragstart", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".column-controls")) {
        event.preventDefault();
        return;
      }

      setDraggingColumnId(columnId);
      document.body.classList.add("drag-scroll-main-only");
      columnElement.classList.add("column-dragging");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", `column:${columnId}`);
      }
    });

    columnHead.addEventListener("dragend", () => {
      setDraggingColumnId(null);
      document.body.classList.remove("drag-scroll-main-only");
      clearColumnDropIndicators(boardElement);
      columnElement.classList.remove("column-dragging");
    });

    columnElement.addEventListener("dragover", (event) => {
      const data = event.dataTransfer?.getData("text/plain") || "";
      const draggedId = getDraggingColumnId() || (data.startsWith("column:") ? data.slice("column:".length) : "");
      if (!draggedId || draggedId === columnId) {
        return;
      }

      event.preventDefault();
      clearColumnDropIndicators(boardElement);
      const shouldInsertBefore = shouldInsertColumnBefore(columnElement, event.clientY);
      columnElement.classList.add(shouldInsertBefore ? "column-drop-before" : "column-drop-after");
      columnElement.dataset.dropPosition = shouldInsertBefore ? "before" : "after";
    });

    columnElement.addEventListener("dragleave", (event) => {
      const related = event.relatedTarget;
      if (related instanceof Node && columnElement.contains(related)) {
        return;
      }

      columnElement.classList.remove("column-drop-before", "column-drop-after");
      columnElement.dataset.dropPosition = "";
    });

    columnElement.addEventListener("drop", (event) => {
      const data = event.dataTransfer?.getData("text/plain") || "";
      const draggedId = getDraggingColumnId() || (data.startsWith("column:") ? data.slice("column:".length) : "");
      if (!draggedId || draggedId === columnId) {
        return;
      }

      event.preventDefault();
      const position = columnElement.dataset.dropPosition === "before" ? "before" : "after";
      clearColumnDropIndicators(boardElement);
      moveColumnByDrop(draggedId, columnId, position);
    });
  });
}

function shouldInsertColumnBefore(columnElement, cursorY) {
  const rect = columnElement.getBoundingClientRect();
  return cursorY < rect.top + rect.height / 2;
}

export function updateDropIndicator(taskList, cursorY) {
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

export function clearCardIndicators(taskList) {
  taskList.querySelectorAll(".task.drop-indicator").forEach((card) => {
    card.classList.remove("drop-indicator");
  });
}

export function clearDropIndicators(boardElement) {
  boardElement?.querySelectorAll(".task-list").forEach((list) => {
    list.classList.remove("drag-over", "drop-at-end");
    list.dataset.dropBeforeId = "";
    clearCardIndicators(list);
  });
}

export function clearColumnDropIndicators(boardElement) {
  boardElement?.querySelectorAll(".column").forEach((column) => {
    column.classList.remove("column-drop-before", "column-drop-after", "column-dragging");
    column.dataset.dropPosition = "";
  });
}
