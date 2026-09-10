import type { AIService } from "./types"
import { mockAIService } from "./mock-ai.service"
import { liveAIService } from "./live-ai.service"
import { getAiMode } from "@/lib/settings"

/**
 * AI 服务工厂。
 *
 * 运行模式来自 SystemSetting（设置页「AI 服务」开关，默认 mock）：
 * - mock → 内置 Mock 实现，无需任何 API Key
 * - live → 真实供应商：文本走 Qwen（主力）/ DeepSeek（辅助），
 *   图片/视频按「线上自定义模型 → 本地 ComfyUI」顺序，全部不可用时给出明确错误。
 *
 * 每次调用前读取模式（5s 进程缓存），切换开关即时生效。
 * 注意：不要在模块顶层读取设置后再条件导入，以便 Next.js 静态分析两种实现。
 */
export function getAIService(): AIService {
  return modeAwareAIService
}

/** 把每个方法转发到当前模式对应实现。 */
const modeAwareAIService: AIService = new Proxy({} as AIService, {
  get(_target, method: string) {
    const mockImpl = (mockAIService as unknown as Record<string, unknown>)[method]
    const liveImpl = (liveAIService as unknown as Record<string, unknown>)[method]
    if (typeof mockImpl !== "function" || typeof liveImpl !== "function") {
      throw new Error(`未知的 AI 能力：${method}`)
    }
    return async (...args: unknown[]) => {
      const mode = await getAiMode()
      const impl = mode === "live" ? liveImpl : mockImpl
      return (impl as (...a: unknown[]) => Promise<unknown>)(...args)
    }
  },
})

export type { AIService } from "./types"
export * from "./types"
