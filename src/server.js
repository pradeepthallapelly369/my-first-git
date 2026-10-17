import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import {
  completeTask,
  createTask,
  editTask,
  loadTasks,
  removeTask,
  saveTasks,
  setTaskDueDate,
  setTaskPriority
} from "./app.js";

const projectRoot = process.cwd();
const taskFile = resolve(projectRoot, "tasks.json");
const publicDir = resolve(projectRoot, "src", "public");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(payload)}\n`);
}

function applyTaskMutation(result, response, successStatus = 200) {
  if (!result.ok) {
    sendJson(response, 400, result);
    return;
  }

  saveTasks(taskFile, result.tasks)
    .then(() => {
      sendJson(response, successStatus, { ok: true, task: result.task, tasks: result.tasks });
    })
    .catch((error) => {
      sendJson(response, 500, { ok: false, message: error.message });
    });
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function serveStaticAsset(pathname, response) {
  const filePath = pathname === "/" ? join(publicDir, "index.html") : join(publicDir, pathname);

  try {
    const content = await readFile(filePath);
    const type = contentTypes[extname(filePath)] || "text/plain; charset=utf-8";
    response.writeHead(200, { "content-type": type });
    response.end(content);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/tasks" && request.method === "GET") {
      const tasks = await loadTasks(taskFile);
      sendJson(response, 200, { ok: true, tasks });
      return;
    }

    if (url.pathname === "/api/tasks" && request.method === "POST") {
      const body = JSON.parse((await readRequestBody(request)) || "{}");
      const tasks = await loadTasks(taskFile);
      const result = createTask(tasks, body.title || "", {
        priority: body.priority,
        dueDate: body.dueDate
      });

      if (!result.ok) {
        sendJson(response, 400, result);
        return;
      }

      await saveTasks(taskFile, result.tasks);
      sendJson(response, 201, { ok: true, task: result.task, tasks: result.tasks });
      return;
    }

    if (url.pathname.startsWith("/api/tasks/") && request.method === "POST") {
      const [, , , idSegment, action] = url.pathname.split("/");
      const id = Number(idSegment);
      const tasks = await loadTasks(taskFile);
      const body = JSON.parse((await readRequestBody(request)) || "{}");

      const result =
        action === "complete"
          ? completeTask(tasks, id)
          : action === "remove"
            ? removeTask(tasks, id)
            : action === "edit"
              ? editTask(tasks, id, body.title || "")
              : action === "priority"
                ? setTaskPriority(tasks, id, body.priority)
                : action === "due"
                  ? setTaskDueDate(tasks, id, body.dueDate === "" ? null : body.dueDate)
                  : { ok: false, message: "Unknown task action." };

      if (action === "complete" || action === "remove" || action === "edit" || action === "priority" || action === "due") {
        applyTaskMutation(result, response);
        return;
      }

      sendJson(response, 404, result);
      return;
    }

    await serveStaticAsset(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { ok: false, message: error.message });
  }
});

server.listen(port, () => {
  console.log(`Task app running at http://localhost:${port}`);
});
