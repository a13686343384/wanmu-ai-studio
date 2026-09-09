import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { invokeCustomModel } from "@/lib/plugins/invoke"
import { invokeSchema } from "@/lib/validations/plugin"

/**
 * POST /api/plugins/models/[id]/invoke
 * 调用自定义模型：按模板配置提交上游，async 模板由服务端轮询到完成。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const model = await prisma.customModel.findFirst({
      where: { id: params.id, workspace: { members: { some: { userId: user.id } } } },
    })
    if (!model) return jsonError("模型不存在或无权访问", 404)
    if (!model.enabled) return jsonError("模型已停用", 400)

    const body = await req.json()
    const input = invokeSchema.parse(body)

    let apiKey = model.apiKey ?? undefined
    if (model.credentialId) {
      const credential = await prisma.credential.findUnique({
        where: { id: model.credentialId },
        select: { apiKey: true },
      })
      apiKey = credential?.apiKey ?? apiKey
    }

    const result = await invokeCustomModel(
      {
        baseUrl: model.baseUrl,
        apiKey,
        auth: model.auth as Record<string, never>,
        constraints: model.constraints as Record<string, never>,
        submit: model.submit as { method?: string; path: string; body: Record<string, unknown> },
        edits: (model.edits ?? null) as never,
        poll: (model.poll ?? null) as never,
        firstLast: (model.firstLast ?? null) as never,
        lifecycle: model.lifecycle === "async" ? "async" : "sync",
        extract: model.extract as Record<string, never>,
      },
      input,
    )

    if (!result.ok) return jsonError(result.error, 502)
    return jsonOk({ url: result.url, text: result.text }, "调用成功")
  },
)
