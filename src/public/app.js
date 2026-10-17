const taskList = document.querySelector("#task-list");
const message = document.querySelector("#message");
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#title");
const priorityInput = document.querySelector("#priority");
const dueDateInput = document.querySelector("#dueDate");
const template = document.querySelector("#task-item-template");

function setMessage(text, tone = "") {
  message.textContent = text;
  message.dataset.tone = tone;
}

async function sendTaskRequest(url, payload = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "No tasks yet. Add one to get started.";
    taskList.append(item);
    return;
  }

  for (const task of tasks) {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".task-item");
    const state = fragment.querySelector(".task-state");
    const priority = fragment.querySelector(".task-priority");
    const due = fragment.querySelector(".task-due");
    const editForm = fragment.querySelector(".task-edit-form");
    const titleField = fragment.querySelector(".task-title-input");
    const priorityField = fragment.querySelector(".task-priority-select");
    const dueField = fragment.querySelector(".task-due-input");
    const completeButton = fragment.querySelector(".complete-button");
    const clearDueButton = fragment.querySelector(".clear-due-button");
    const removeButton = fragment.querySelector(".remove-button");

    item.dataset.taskId = String(task.id);
    item.dataset.done = String(task.done);
    item.dataset.priority = task.priority;

    state.textContent = task.done ? "Done" : "Open";
    priority.textContent = `Priority: ${task.priority}`;
    due.textContent = task.dueDate ? `Due: ${task.dueDate}` : "No due date";
    titleField.value = task.title;
    priorityField.value = task.priority;
    dueField.value = task.dueDate || "";
    completeButton.disabled = task.done;

    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/edit`, {
          title: titleField.value
        });

        renderTasks(payload.tasks);
        setMessage(`Updated "${payload.task.title}".`, "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    priorityField.addEventListener("change", async () => {
      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/priority`, {
          priority: priorityField.value
        });

        renderTasks(payload.tasks);
        setMessage(`Priority changed to ${payload.task.priority}.`, "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    dueField.addEventListener("change", async () => {
      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/due`, {
          dueDate: dueField.value
        });

        renderTasks(payload.tasks);
        setMessage(
          payload.task.dueDate
            ? `Due date set to ${payload.task.dueDate}.`
            : "Due date cleared.",
          "success"
        );
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    completeButton.addEventListener("click", async () => {
      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/complete`);
        renderTasks(payload.tasks);
        setMessage(`Completed "${payload.task.title}".`, "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    clearDueButton.addEventListener("click", async () => {
      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/due`, {
          dueDate: ""
        });

        renderTasks(payload.tasks);
        setMessage(`Cleared the due date for "${payload.task.title}".`, "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    removeButton.addEventListener("click", async () => {
      try {
        const payload = await sendTaskRequest(`/api/tasks/${task.id}/remove`);
        renderTasks(payload.tasks);
        setMessage(`Removed "${payload.task.title}".`, "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });

    taskList.append(fragment);
  }
}

async function loadTasks() {
  const response = await fetch("/api/tasks");
  const payload = await response.json();
  renderTasks(payload.tasks);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const payload = await sendTaskRequest("/api/tasks", {
      title: titleInput.value.trim(),
      priority: priorityInput.value,
      dueDate: dueDateInput.value
    });

    titleInput.value = "";
    priorityInput.value = "medium";
    dueDateInput.value = "";
    renderTasks(payload.tasks);
    setMessage(`Added "${payload.task.title}".`, "success");
  } catch (error) {
    setMessage(error.message, "error");
  }
});

loadTasks().catch(() => {
  setMessage("Could not load tasks.", "error");
});
