/**
 * 服务端日志工具 — 同时输出到 console 和日志文件。
 * 日志文件按日期分割，保留在 .logs/ 目录下。
 * 
 * 用法：
 *   import { log } from "@/lib/logger"
 *   log.info("[finalize] 开始 | script=xxx")
 *   log.error("[extraction] 失败", err)
 */
import { appendFileSync, mkdirSync, existsSync } from "fs"
import { join } from "path"

const LOG_DIR = join(process.cwd(), ".logs")

// 确保日志目录存在
if (!existsSync(LOG_DIR)) {
  try { mkdirSync(LOG_DIR, { recursive: true }) } catch { /* ignore */ }
}

function getLogFile(): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return join(LOG_DIR, `${date}.log`)
}

function write(level: string, message: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
  const line = `[${ts}] [${level}] ${message}${extra ? " | " + (extra instanceof Error ? extra.message : JSON.stringify(extra)) : ""}\n`
  
  // 输出到 console
  if (level === "error") console.error(line.trimEnd())
  else console.log(line.trimEnd())
  
  // 追加写入日志文件（不会因重启丢失）
  try {
    appendFileSync(getLogFile(), line)
  } catch { /* 文件写入失败不影响业务 */ }
}

export const log = {
  info: (msg: string, extra?: unknown) => write("INFO", msg, extra),
  warn: (msg: string, extra?: unknown) => write("WARN", msg, extra),
  error: (msg: string, extra?: unknown) => write("ERROR", msg, extra),
}
