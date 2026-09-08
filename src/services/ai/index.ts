import type { AIService } from "./types"
import { mockAIService } from "./mock-ai.service"

/**
 * AI 服务工厂。
 *
 * `AI_MODE=mock`（默认）→ 使用内置 Mock 实现，无需任何 API Key。
 * `AI_MODE=live`         → 使用真实供应商实现（接入时在此注册）。
 *
 * 注意：不要在模块顶层读取 process.env 后再条件导入，
 * 这样 Next.js 才能对两种实现都做静态分析。
 */
export function getAIService(): AIService {
  const mode = process.env.AI_MODE ?? "mock"

  if (mode === "live") {
    // 真实实现接入点：import { liveAIService } from "./live-ai.service"; return liveAIService
    console.warn("[ai] AI_MODE=live 但尚未配置真实供应商，回退到 Mock 实现")
  }

  return mockAIService
}

export type { AIService } from "./types"
export * from "./types"
