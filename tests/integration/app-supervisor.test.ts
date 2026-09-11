import { test } from "node:test"
import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { supervise } from "../../scripts/lib/app-supervisor.mjs"
test("a failed web process stops only its paired worker and returns a failing exit code", async () => {
  const code = await supervise(
    [
      {
        name: "web",
        command: process.execPath,
        args: ["-e", "setTimeout(()=>process.exit(3),80)"],
      },
      {
        name: "worker",
        command: process.execPath,
        args: ["-e", "setInterval(()=>{},1000)"],
      },
    ],
    { signals: new EventEmitter(), graceMs: 300 },
  )
  assert.equal(code, 3)
})
test("SIGTERM shuts down both child process groups and resolves", async () => {
  const signals = new EventEmitter()
  const promise = supervise(
    [
      {
        name: "web",
        command: process.execPath,
        args: ["-e", "setInterval(()=>{},1000)"],
      },
      {
        name: "worker",
        command: process.execPath,
        args: ["-e", "setInterval(()=>{},1000)"],
      },
    ],
    { signals, graceMs: 300 },
  )
  setTimeout(() => signals.emit("SIGTERM"), 100)
  assert.equal(await promise, 0)
})
