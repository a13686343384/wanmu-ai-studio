import { prisma } from "@/lib/prisma"

/**
 * 全局运行时设置（SystemSetting 表，key-value）。
 *
 * - `ai_mode`: "mock" | "live" —— 全局 MOCK 开关。mock（默认）用内置 Mock 实现；
 *   live 时文本走 Qwen/DeepSeek 真实接口，图片/视频走线上自定义模型或本地 ComfyUI。
 * - `ai_providers`: { qwen: { baseUrl, model }, deepseek: { baseUrl, model }, comfyui: { baseUrl } }
 *
 * 进程内缓存 5 秒，避免每个请求都查库；写入时主动失效。
 */

export type AiMode = "mock" | "live"

export interface AiProviders {
  /** 主力文本理解模型（OpenAI 兼容接口） */
  qwen: { baseUrl: string; model: string; credentialName: string }
  /** 辅助文本模型（OpenAI 兼容接口） */
  deepseek: { baseUrl: string; model: string; credentialName: string }
  /** 本地 ComfyUI（图片/视频辅助通道） */
  comfyui: { baseUrl: string }
}

const AI_MODE_KEY = "ai_mode"
const AI_PROVIDERS_KEY = "ai_providers"

export const DEFAULT_PROVIDERS: AiProviders = {
  qwen: {
    baseUrl: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    model: "qwen3.7-plus",
    credentialName: "阿里云 Qwen（token-plan）",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    credentialName: "DeepSeek",
  },
  comfyui: {
    baseUrl: "http://192.168.1.12:8118",
  },
}

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

export async function getAiProviders(): Promise<AiProviders> {
  const data = await readAll()
  const stored = (data[AI_PROVIDERS_KEY] ?? {}) as Partial<AiProviders>
  return {
    qwen: { ...DEFAULT_PROVIDERS.qwen, ...stored.qwen },
    deepseek: { ...DEFAULT_PROVIDERS.deepseek, ...stored.deepseek },
    comfyui: { ...DEFAULT_PROVIDERS.comfyui, ...stored.comfyui },
  }
}

export async function setAiProviders(providers: AiProviders): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: AI_PROVIDERS_KEY },
    create: { key: AI_PROVIDERS_KEY, value: JSON.parse(JSON.stringify(providers)) },
    update: { value: JSON.parse(JSON.stringify(providers)) },
  })
  invalidate()
}
