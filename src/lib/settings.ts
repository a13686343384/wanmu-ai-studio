import { prisma } from "@/lib/prisma"

/**
 * 全局运行时设置（SystemSetting 表，key-value）。
 *
 * - `ai_mode`: "mock" | "live" —— 全局 MOCK 开关。
 *   mock（默认）用内置 Mock 实现；live 时所有模型从 CustomModel 表读取。
 *
 * 进程内缓存 5 秒，避免每个请求都查库；写入时主动失效。
 */

export type AiMode = "mock" | "live"

const AI_MODE_KEY = "ai_mode"

type Cache = { at: number; data: Record<string, unknown> }
let cache: Cache | null = null
const CACHE_MS = 5000

async function readAll(): Promise<Record<string, unknown>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  const rows = await prisma.systemSetting.findMany()
  const data: Record<string, unknown> = {}
  for (const row of rows) data[row.key] = row.value
  cache = { at: Date.now(), data }
  return data
}

function invalidate() {
  cache = null
}

export async function getAiMode(): Promise<AiMode> {
  const data = await readAll()
  return data[AI_MODE_KEY] === "live" ? "live" : "mock"
}

export async function setAiMode(mode: AiMode): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: AI_MODE_KEY },
    create: { key: AI_MODE_KEY, value: mode },
    update: { value: mode },
  })
  invalidate()
}
