/**
 * OpenAI 兼容 chat.completions 客户端（Qwen token-plan / DeepSeek 共用）。
 * 输出 JSON 的解析带容错：剥掉 ```json 围栏、截取首个平衡的 {} / []。
 */

export interface ChatArgs {
  baseUrl: string
  apiKey: string
  model: string
  system?: string
  user: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export class AiUpstreamError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message)
    this.name = "AiUpstreamError"
  }
}

export async function chatCompletion(args: ChatArgs): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 120_000)
  try {
    const res = await fetch(`${args.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [
          ...(args.system ? [{ role: "system", content: args.system }] : []),
          { role: "user", content: args.user },
        ],
        temperature: args.temperature ?? 0.7,
        max_tokens: args.maxTokens ?? 4096,
      }),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      throw new AiUpstreamError(
        `上游 ${args.model} 返回 ${res.status}：${detail}`,
        args.model,
      )
    }
    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = payload.choices?.[0]?.message?.content
    if (!content) throw new AiUpstreamError("上游返回缺少 content", args.model)
    return content
  } catch (error) {
    if (error instanceof AiUpstreamError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiUpstreamError(`上游 ${args.model} 请求超时`, args.model)
    }
    throw new AiUpstreamError(
      error instanceof Error ? error.message : "上游请求失败",
      args.model,
    )
  } finally {
    clearTimeout(timer)
  }
}

/** 从模型输出中提取 JSON 对象/数组：剥围栏、按平衡括号截取。 */
export function extractJson<T>(text: string): T {
  const stripped = text
    .replace(/```(?:json)?/gi, "```")
    .split("```")
    .map((part, index) => (index % 2 === 1 ? part : part))
    .join("")
  const cleaned = stripped.replace(/```/g, "").trim()

  const direct = tryParse<T>(cleaned)
  if (direct !== undefined) return direct

  for (const [open, close] of [
    ["{", "}"],
    ["[", "]"],
  ] as const) {
    const start = cleaned.indexOf(open)
    const end = cleaned.lastIndexOf(close)
    if (start !== -1 && end > start) {
      const slice = tryParse<T>(cleaned.slice(start, end + 1))
      if (slice !== undefined) return slice
    }
  }
  throw new Error("模型输出不是有效 JSON")
}

function tryParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

/** 让模型输出 JSON 的系统提示词尾缀。 */
export const JSON_ONLY_SUFFIX =
  "只输出一个合法的 JSON，不要输出任何解释、前后缀或 Markdown 代码块之外的内容。"
