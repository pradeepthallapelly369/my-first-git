import { resolve } from "node:path";

import { formatTaskResult, runTaskCommand } from "./app.js";

const taskFile = resolve(process.cwd(), "tasks.json");

try {
  const result = await runTaskCommand(process.argv.slice(2), taskFile);

  if (!result.ok) {
    console.error(formatTaskResult(result));
    process.exitCode = 1;
  } else {
    console.log(formatTaskResult(result));
  }
} catch (error) {
  console.error(`Failed to run task command: ${error.message}`);
  process.exitCode = 1;
}
