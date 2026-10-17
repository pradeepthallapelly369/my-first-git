# My First Git

Small Node.js practice project for learning Codex with ECC.
The CLI now stores tasks in `tasks.json` in the project root.

## Commands

```bash
npm test
npm start -- list
npm start -- add "Write more code"
npm start -- add "Ship launch plan" --priority high --due 2026-04-30
npm start -- complete 1
npm start -- remove 2
npm start -- edit 1 "Learn Codex deeply"
npm start -- priority 1 low
npm start -- due 1 2026-05-01
npm start -- due 1 clear
npm run web
```

Open `http://localhost:3000` after `npm run web` to use the browser UI.

Features in the final version:
- shared task store for CLI and browser
- create, list, edit, complete, and remove tasks
- task priorities: `low`, `medium`, `high`
- due dates in `YYYY-MM-DD` format
- automatic sorting by completion state, priority, due date, and id

## Good ECC prompts

- `Review this project and suggest one beginner-friendly improvement.`
- `Add a complete command with tests first.`
- `Add due dates or priorities and update the tests.`
- `Refactor the storage layer so the CLI code stays thin.`
- `Review the browser API routes for bugs and missing validation.`
- `Add task filtering and search without breaking the current tests.`
- `Refactor the parser without changing behavior.`
- `Find bugs and missing edge-case tests.`
