const STORAGE_KEY = "kanban.tasks.v1";
const COLUMNS = ["todo", "inprogress", "done"];

let tasks = loadTasks();
let draggingTaskId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");

form.addEventListener("submit", onCreateTask);
setupDropZones();
render();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function onCreateTask(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  tasks.push({
    id: crypto.randomUUID(),
    title,
    description,
    status: "todo",
  });

  form.reset();
  titleInput.focus();
  saveTasks();
  render();
}

function render() {
  COLUMNS.forEach((column) => {
    const list = document.getElementById(`${column}-list`);
    list.innerHTML = "";

    tasks
      .filter((task) => task.status === column)
      .forEach((task) => list.appendChild(createTaskElement(task)));
  });
}

function createTaskElement(task) {
  const card = document.createElement("article");
  card.className = "task";
  card.draggable = true;
  card.dataset.id = task.id;

  card.innerHTML = `
    <h3 class="task-title"></h3>
    <p class="task-description"></p>
    <div class="task-actions">
      <button type="button" data-action="left">←</button>
      <button type="button" data-action="right">→</button>
      <button type="button" class="delete" data-action="delete">Delete</button>
    </div>
  `;

  card.querySelector(".task-title").textContent = task.title;
  const description = card.querySelector(".task-description");
  description.textContent = task.description || "";
  description.style.display = task.description ? "block" : "none";

  const leftButton = card.querySelector('[data-action="left"]');
  const rightButton = card.querySelector('[data-action="right"]');

  leftButton.disabled = task.status === "todo";
  rightButton.disabled = task.status === "done";

  card.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    if (!action) {
      return;
    }

    if (action === "delete") {
      deleteTask(task.id);
      return;
    }

    if (action === "left") {
      moveTask(task.id, -1);
      return;
    }

    if (action === "right") {
      moveTask(task.id, 1);
    }
  });

  card.addEventListener("dragstart", () => {
    draggingTaskId = task.id;
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    draggingTaskId = null;
    card.classList.remove("dragging");
    document.querySelectorAll(".task-list").forEach((list) => list.classList.remove("drag-over"));
  });

  return card;
}

function moveTask(taskId, direction) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  const index = COLUMNS.indexOf(task.status);
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= COLUMNS.length) {
    return;
  }

  task.status = COLUMNS[nextIndex];
  saveTasks();
  render();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  render();
}

function setupDropZones() {
  document.querySelectorAll(".column").forEach((columnElement) => {
    const taskList = columnElement.querySelector(".task-list");
    const column = columnElement.dataset.column;

    taskList.addEventListener("dragover", (event) => {
      event.preventDefault();
      taskList.classList.add("drag-over");
    });

    taskList.addEventListener("dragleave", () => {
      taskList.classList.remove("drag-over");
    });

    taskList.addEventListener("drop", (event) => {
      event.preventDefault();
      taskList.classList.remove("drag-over");

      if (!draggingTaskId) {
        return;
      }

      const task = tasks.find((item) => item.id === draggingTaskId);
      if (!task || task.status === column) {
        return;
      }

      task.status = column;
      saveTasks();
      render();
    });
  });
}
