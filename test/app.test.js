import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  completeTask,
  createTask,
  editTask,
  formatTaskResult,
  removeTask,
  runTaskCommand,
  setTaskDueDate,
  setTaskPriority
} from "../src/app.js";

async function createTaskFilePath() {
  const dir = await mkdtemp(join(tmpdir(), "my-first-git-"));
  return join(dir, "tasks.json");
}

test("adds a task with metadata when values are provided", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(
    ["add", "Buy", "milk", "--priority", "high", "--due", "2026-04-20"],
    filePath
  );
  const saved = JSON.parse(await readFile(filePath, "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.action, "add");
  assert.equal(result.task.title, "Buy milk");
  assert.equal(result.task.id, 3);
  assert.equal(result.task.priority, "high");
  assert.equal(result.task.dueDate, "2026-04-20");
  assert.equal(formatTaskResult(result), "Added task #3: Buy milk");
  assert.equal(saved[0].priority, "high");
  assert.equal(saved[0].dueDate, "2026-04-20");
});

test("creates a task in memory", () => {
  const result = createTask([{ id: 1, title: "Existing", done: false, priority: "medium", dueDate: null }], "New item");

  assert.equal(result.ok, true);
  assert.equal(result.task.id, 2);
  assert.equal(result.tasks.length, 2);
});

test("rejects add when the title is missing", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["add"], filePath);

  assert.deepEqual(result, {
    ok: false,
    message: "Task title is required."
  });
});

test("rejects invalid priority values", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["add", "Task", "--priority", "urgent"], filePath);

  assert.deepEqual(result, {
    ok: false,
    message: "Priority must be one of: low, medium, high."
  });
});

test("rejects invalid due dates", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["add", "Task", "--due", "2026-02-31"], filePath);

  assert.deepEqual(result, {
    ok: false,
    message: "Due date must be a real calendar date."
  });
});

test("lists default tasks when storage does not exist yet", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["list"], filePath);

  assert.equal(result.ok, true);
  assert.equal(result.action, "list");
  assert.match(formatTaskResult(result), /Learn Codex/);
  assert.match(formatTaskResult(result), /\(high\)|\(medium\)/);
});

test("completes a task and persists the updated state", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["complete", "1"], filePath);
  const saved = JSON.parse(await readFile(filePath, "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.action, "complete");
  assert.equal(result.task.done, true);
  assert.equal(formatTaskResult(result), "Completed task #1: Learn Codex");
  assert.equal(saved.find((task) => task.id === 1).done, true);
});

test("completes a task in memory", () => {
  const result = completeTask(
    [{ id: 3, title: "Ship it", done: false, priority: "medium", dueDate: null }],
    3
  );

  assert.equal(result.ok, true);
  assert.equal(result.task.done, true);
  assert.equal(result.tasks[0].done, true);
});

test("removes a task and persists the updated state", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["remove", "2"], filePath);
  const saved = JSON.parse(await readFile(filePath, "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.action, "remove");
  assert.equal(result.task.id, 2);
  assert.equal(formatTaskResult(result), "Removed task #2: Run the tests");
  assert.equal(saved.some((task) => task.id === 2), false);
});

test("removes a task in memory", () => {
  const result = removeTask(
    [
      { id: 1, title: "Keep", done: false, priority: "medium", dueDate: null },
      { id: 2, title: "Drop", done: false, priority: "low", dueDate: null }
    ],
    2
  );

  assert.equal(result.ok, true);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].id, 1);
});

test("edits a task title", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["edit", "1", "Master", "Codex"], filePath);

  assert.equal(result.ok, true);
  assert.equal(result.task.title, "Master Codex");
  assert.equal(formatTaskResult(result), "Updated task #1: Master Codex");
});

test("edits a task in memory", () => {
  const result = editTask(
    [{ id: 1, title: "Old", done: false, priority: "medium", dueDate: null }],
    1,
    "New"
  );

  assert.equal(result.ok, true);
  assert.equal(result.task.title, "New");
});

test("sets task priority", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["priority", "1", "low"], filePath);

  assert.equal(result.ok, true);
  assert.equal(result.task.priority, "low");
  assert.equal(formatTaskResult(result), "Set priority for task #1 to low.");
});

test("sets task priority in memory", () => {
  const result = setTaskPriority(
    [{ id: 1, title: "Task", done: false, priority: "medium", dueDate: null }],
    1,
    "high"
  );

  assert.equal(result.ok, true);
  assert.equal(result.task.priority, "high");
});

test("sets and clears due dates", async () => {
  const filePath = await createTaskFilePath();
  const setResult = await runTaskCommand(["due", "1", "2026-05-01"], filePath);
  const clearResult = await runTaskCommand(["due", "1", "clear"], filePath);

  assert.equal(setResult.ok, true);
  assert.equal(setResult.task.dueDate, "2026-05-01");
  assert.equal(formatTaskResult(setResult), "Set due date for task #1 to 2026-05-01.");
  assert.equal(clearResult.ok, true);
  assert.equal(clearResult.task.dueDate, null);
  assert.equal(formatTaskResult(clearResult), "Cleared due date for task #1.");
});

test("sets due dates in memory", () => {
  const result = setTaskDueDate(
    [{ id: 1, title: "Task", done: false, priority: "medium", dueDate: null }],
    1,
    "2026-06-10"
  );

  assert.equal(result.ok, true);
  assert.equal(result.task.dueDate, "2026-06-10");
});

test("rejects unknown commands", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["rename", "1"], filePath);

  assert.deepEqual(result, {
    ok: false,
    message:
      'Unknown command. Use "add <task> [--priority level] [--due YYYY-MM-DD]", "list", "complete <id>", "remove <id>", "edit <id> <title>", "priority <id> <level>", or "due <id> <YYYY-MM-DD|clear>".'
  });
});

test("rejects invalid ids for complete and remove", async () => {
  const filePath = await createTaskFilePath();
  const completeResult = await runTaskCommand(["complete", "abc"], filePath);
  const removeResult = await runTaskCommand(["remove", "0"], filePath);

  assert.deepEqual(completeResult, {
    ok: false,
    message: "Task id must be a positive integer."
  });
  assert.deepEqual(removeResult, {
    ok: false,
    message: "Task id must be a positive integer."
  });
});

test("returns a not found message when a task id does not exist", async () => {
  const filePath = await createTaskFilePath();
  const result = await runTaskCommand(["remove", "99"], filePath);

  assert.deepEqual(result, {
    ok: false,
    message: "Task #99 was not found."
  });
});
