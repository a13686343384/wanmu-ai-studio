import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { supervise } from "./lib/app-supervisor.mjs"
const require = createRequire(import.meta.url)
const mode = process.argv[2]
if (!["dev", "start"].includes(mode))
  throw new Error("Usage: node scripts/run-app.mjs dev|start")
process.exitCode = await supervise([
  {
    name: "Next.js",
    command: process.execPath,
    args: [
      require.resolve("next/dist/bin/next"),
      mode,
      "--port",
      "3000",
      ...process.argv.slice(3),
    ],
  },
  {
    name: "task worker",
    command: process.execPath,
    args: [
      "--import",
      "tsx",
      fileURLToPath(new URL("./task-worker.ts", import.meta.url)),
    ],
  },
])
