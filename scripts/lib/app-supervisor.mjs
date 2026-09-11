import { spawn } from "node:child_process"

/**
 * Owns only the process groups it creates. If either service exits, stop its
 * partner so a dead worker cannot leave an apparently healthy web application.
 * @param {{name:string,command:string,args:string[]}[]} commands
 * @param {{signals?:import('node:events').EventEmitter,graceMs?:number}} options
 */
export function supervise(
  commands,
  { signals = process, graceMs = 10000 } = {},
) {
  return new Promise((resolve) => {
    const grouped = process.platform !== "win32"
    const children = commands.map((spec) => ({
      name: spec.name,
      child: spawn(spec.command, spec.args, {
        stdio: "inherit",
        detached: grouped,
      }),
    }))
    let stopping = false,
      result = 0,
      remaining = children.length,
      timer
    const stopChild = (child, signal) => {
      if (child.exitCode !== null || child.signalCode !== null || !child.pid)
        return
      try {
        if (grouped) process.kill(-child.pid, signal)
        else child.kill(signal)
      } catch (error) {
        if (error.code !== "ESRCH")
          console.error("[app] Could not stop child:", error.message)
      }
    }
    const stop = (code = 0) => {
      if (stopping) return
      stopping = true
      result = code
      for (const { child } of children) stopChild(child, "SIGTERM")
      timer = setTimeout(() => {
        for (const { child } of children) stopChild(child, "SIGKILL")
      }, graceMs)
      timer.unref()
    }
    const onSignal = () => stop(0)
    signals.on("SIGINT", onSignal)
    signals.on("SIGTERM", onSignal)
    for (const { name, child } of children) {
      let closed = false
      const finish = (code) => {
        if (closed) return
        closed = true
        if (!stopping) {
          console.log(`[app] ${name} stopped; shutting down paired service`)
          stop(code ?? 1)
        }
        remaining--
        if (!remaining) {
          clearTimeout(timer)
          signals.off("SIGINT", onSignal)
          signals.off("SIGTERM", onSignal)
          resolve(result)
        }
      }
      child.on("error", (error) => {
        console.error(`[app] ${name} failed: ${error.message}`)
        finish(1)
      })
      child.on("exit", (code) => finish(code))
    }
    if (!children.length) {
      signals.off("SIGINT", onSignal)
      signals.off("SIGTERM", onSignal)
      resolve(0)
    }
  })
}
