import { readFile, writeFile } from "node:fs/promises";

const PRIORITIES = ["low", "medium", "high"];
const DEFAULT_TASKS = [
  { id: 1, title: "Learn Codex", done: false, priority: "medium", dueDate: null },
  { id: 2, title: "Run the tests", done: true, priority: "high", dueDate: null }
];

function normalizeTask(task) {
  return {
    id: Number(task.id),
    title: String(task.title || "").trim(),
    done: Boolean(task.done),
    priority: normalizePriority(task.priority || "medium"),
    dueDate: normalizeDueDate(task.dueDate)
  };
}

function normalizeTasks(tasks) {
  return tasks.map(normalizeTask);
}

function validateId(id) {
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Task id must be a positive integer." };
  }

  return { ok: true };
}

function findTask(tasks, id) {
  return tasks.find((item) => item.id === id);
}

function sortTasks(tasks) {
  const priorityRank = { high: 0, medium: 1, low: 2 };

  return [...tasks].sort((left, right) => {
    if (left.done !== right.done) {
      return Number(left.done) - Number(right.done);
    }

    if (left.priority !== right.priority) {
      return priorityRank[left.priority] - priorityRank[right.priority];
    }

    if (left.dueDate && right.dueDate && left.dueDate !== right.dueDate) {
      return left.dueDate.localeCompare(right.dueDate);
    }

    if (left.dueDate && !right.dueDate) {
      return -1;
    }

    if (!left.dueDate && right.dueDate) {
      return 1;
    }

    return left.id - right.id;
  });
}

export function normalizePriority(priority) {
  return PRIORITIES.includes(priority) ? priority : "medium";
}

export function normalizeDueDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

export function validatePriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    return {
      ok: false,
      message: `Priority must be one of: ${PRIORITIES.join(", ")}.`
    };
  }

  return { ok: true };
}

export function validateDueDate(dueDate) {
  if (dueDate === null) {
    return { ok: true };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, message: "Due date must use YYYY-MM-DD format." };
  }

  const date = new Date(`${dueDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) {
    return { ok: false, message: "Due date must be a real calendar date." };
  }

  return { ok: true };
}

export async function loadTasks(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error("Task data must be an array.");
    }

    return sortTasks(normalizeTasks(parsed));
  } catch (error) {
    if (error.code === "ENOENT") {
      return DEFAULT_TASKS;
    }

    throw error;
  }
}

export async function saveTasks(filePath, tasks) {
  await writeFile(filePath, `${JSON.stringify(sortTasks(tasks), null, 2)}\n`, "utf8");
}

export function createTask(tasks, title, options = {}) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { ok: false, message: "Task title is required." };
  }

  const priority = options.priority || "medium";
  const priorityValidation = validatePriority(priority);

  if (!priorityValidation.ok) {
    return priorityValidation;
  }

  const dueDate = normalizeDueDate(options.dueDate);
  const dueDateValidation = validateDueDate(dueDate);

  if (!dueDateValidation.ok) {
    return dueDateValidation;
  }

  const nextId = tasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;
  const task = { id: nextId, title: trimmedTitle, done: false, priority, dueDate };

  return {
    ok: true,
    action: "add",
    task,
    tasks: sortTasks([...tasks, task])
  };
}

export function completeTask(tasks, id) {
  const idValidation = validateId(id);

  if (!idValidation.ok) {
    return idValidation;
  }

  const task = findTask(tasks, id);

  if (!task) {
    return { ok: false, message: `Task #${id} was not found.` };
  }

  const updatedTask = { ...task, done: true };

  return {
    ok: true,
    action: "complete",
    task: updatedTask,
    tasks: sortTasks(tasks.map((item) => (item.id === id ? updatedTask : item)))
  };
}

export function removeTask(tasks, id) {
  const idValidation = validateId(id);

  if (!idValidation.ok) {
    return idValidation;
  }

  const task = findTask(tasks, id);

  if (!task) {
    return { ok: false, message: `Task #${id} was not found.` };
  }

  return {
    ok: true,
    action: "remove",
    task,
    tasks: sortTasks(tasks.filter((item) => item.id !== id))
  };
}

export function editTask(tasks, id, title) {
  const idValidation = validateId(id);

  if (!idValidation.ok) {
    return idValidation;
  }

  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { ok: false, message: "Updated task title is required." };
  }

  const task = findTask(tasks, id);

  if (!task) {
    return { ok: false, message: `Task #${id} was not found.` };
  }

  const updatedTask = { ...task, title: trimmedTitle };

  return {
    ok: true,
    action: "edit",
    task: updatedTask,
    tasks: sortTasks(tasks.map((item) => (item.id === id ? updatedTask : item)))
  };
}

export function setTaskPriority(tasks, id, priority) {
  const idValidation = validateId(id);

  if (!idValidation.ok) {
    return idValidation;
  }

  const priorityValidation = validatePriority(priority);

  if (!priorityValidation.ok) {
    return priorityValidation;
  }

  const task = findTask(tasks, id);

  if (!task) {
    return { ok: false, message: `Task #${id} was not found.` };
  }

  const updatedTask = { ...task, priority };

  return {
    ok: true,
    action: "priority",
    task: updatedTask,
    tasks: sortTasks(tasks.map((item) => (item.id === id ? updatedTask : item)))
  };
}

export function setTaskDueDate(tasks, id, dueDateInput) {
  const idValidation = validateId(id);

  if (!idValidation.ok) {
    return idValidation;
  }

  const dueDate = normalizeDueDate(dueDateInput);
  const dueDateValidation = validateDueDate(dueDate);

  if (!dueDateValidation.ok) {
    return dueDateValidation;
  }

  const task = findTask(tasks, id);

  if (!task) {
    return { ok: false, message: `Task #${id} was not found.` };
  }

  const updatedTask = { ...task, dueDate };

  return {
    ok: true,
    action: "due",
    task: updatedTask,
    tasks: sortTasks(tasks.map((item) => (item.id === id ? updatedTask : item)))
  };
}

function parseAddOptions(values) {
  let priority = "medium";
  let dueDate = null;
  const titleParts = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--priority") {
      priority = values[index + 1] || "";
      index += 1;
      continue;
    }

    if (value === "--due") {
      dueDate = values[index + 1] || "";
      index += 1;
      continue;
    }

    titleParts.push(value);
  }

  return { title: titleParts.join(" "), priority, dueDate };
}

export async function runTaskCommand(args, filePath) {
  const tasks = await loadTasks(filePath);
  const [command, ...rest] = args;

  if (command === "add") {
    const parsed = parseAddOptions(rest);
    const result = createTask(tasks, parsed.title, {
      priority: parsed.priority,
      dueDate: parsed.dueDate
    });

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "add", task: result.task };
  }

  if (command === "list") {
    return { ok: true, action: "list", tasks };
  }

  if (command === "complete") {
    const result = completeTask(tasks, Number(rest[0]));

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "complete", task: result.task };
  }

  if (command === "remove") {
    const result = removeTask(tasks, Number(rest[0]));

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "remove", task: result.task };
  }

  if (command === "edit") {
    const result = editTask(tasks, Number(rest[0]), rest.slice(1).join(" "));

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "edit", task: result.task };
  }

  if (command === "priority") {
    const result = setTaskPriority(tasks, Number(rest[0]), rest[1]);

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "priority", task: result.task };
  }

  if (command === "due") {
    const dueValue = rest[1] === "clear" ? null : rest[1];
    const result = setTaskDueDate(tasks, Number(rest[0]), dueValue);

    if (!result.ok) {
      return result;
    }

    await saveTasks(filePath, result.tasks);
    return { ok: true, action: "due", task: result.task };
  }

  return {
    ok: false,
    message:
      'Unknown command. Use "add <task> [--priority level] [--due YYYY-MM-DD]", "list", "complete <id>", "remove <id>", "edit <id> <title>", "priority <id> <level>", or "due <id> <YYYY-MM-DD|clear>".'
  };
}

function formatTaskLine(task) {
  const pieces = [`#${task.id}`, `[${task.done ? "x" : " "}]`, task.title, `(${task.priority})`];

  if (task.dueDate) {
    pieces.push(`due:${task.dueDate}`);
  }

  return pieces.join(" ");
}

export function formatTaskResult(result) {
  if (!result.ok) {
    return result.message;
  }

  if (result.action === "list") {
    return result.tasks.map(formatTaskLine).join("\n");
  }

  if (result.action === "add") {
    return `Added task #${result.task.id}: ${result.task.title}`;
  }

  if (result.action === "complete") {
    return `Completed task #${result.task.id}: ${result.task.title}`;
  }

  if (result.action === "remove") {
    return `Removed task #${result.task.id}: ${result.task.title}`;
  }

  if (result.action === "edit") {
    return `Updated task #${result.task.id}: ${result.task.title}`;
  }

  if (result.action === "priority") {
    return `Set priority for task #${result.task.id} to ${result.task.priority}.`;
  }

  if (result.action === "due") {
    return result.task.dueDate
      ? `Set due date for task #${result.task.id} to ${result.task.dueDate}.`
      : `Cleared due date for task #${result.task.id}.`;
  }

  return "No output available.";
}
