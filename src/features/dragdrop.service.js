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
      if (!draggedId) {
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
      if (!draggedId) {
        return;
      }

      const beforeTaskId = taskList.dataset.dropBeforeId || null;
      moveTaskByDrop(draggedId, column, beforeTaskId);
      clearDropIndicators(boardElement);
    });
  });
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
