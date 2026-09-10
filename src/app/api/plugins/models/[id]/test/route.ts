export const dynamic = "force-dynamic"

import { jsonOk, jsonError, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { comfyPing } from "@/services/ai/comfy/client"

/**
 * POST /api/plugins/models/[id]/test
 * 测试模型连通性。
 * - comfyui → ping /api/system_stats
 * - api (text) → GET /models（OpenAI 兼容端点）
 * - api (image/video/audio/subtitle) → GET baseUrl（任何非超时响应 = 可达）
 */
export const POST = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireUser()

  const model = await prisma.customModel.findFirst({
    where: { id: params.id },
  })
  if (!model) return jsonError("模型不存在", 404)

  const providerType = model.providerType ?? "api"

  // ---- ComfyUI ----
  if (providerType === "comfyui") {
    const ok = await comfyPing(model.baseUrl)
    return jsonOk({
      ok,
      message: ok
        ? `✅ ${model.name}（${model.baseUrl}）连接正常`
        : `❌ ${model.name}（${model.baseUrl}）不可达`,
    })
  }

  // ---- API 类型 ----
  const base = model.baseUrl.replace(/\/$/, "")
  const headers: Record<string, string> = {}
  if (model.apiKey) {
    const auth = (model.auth ?? {}) as { header?: string; scheme?: string }
    const header = auth.header ?? "Authorization"
    const scheme = auth.scheme ?? "Bearer"
    headers[header] = `${scheme} ${model.apiKey}`.trim()
  }

  // 文本模型优先试 /models 端点（OpenAI 兼容标准）
  const probePaths = model.kind === "text"
    ? ["/models", "/v1/models", ""]
    : [""]

  for (const suffix of probePaths) {
    try {
      const url = suffix ? `${base}${suffix.startsWith("/") ? suffix : "/" + suffix}` : base
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
        headers,
      })
      // 2xx = 完全成功；4xx = 服务可达但请求格式问题（也算连通）
      if (res.status < 500) {
        const detail = res.status >= 200 && res.status < 300
          ? "连接正常，认证成功"
          : `服务可达（HTTP ${res.status}），请检查路径或参数配置`
        return jsonOk({ ok: true, message: `✅ ${model.name}：${detail}` })
      }
    } catch {
      // 当前路径超时/失败，尝试下一个
      continue
    }
  }

  // 所有探测路径都失败
  return jsonOk({
    ok: false,
    message: `❌ ${model.name}（${base}）不可达：请检查地址和网络`,
  })
})
