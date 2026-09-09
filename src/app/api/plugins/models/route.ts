import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import type { Prisma } from "@prisma/client"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { pluginModelSchema } from "@/lib/validations/plugin"

/** GET /api/plugins/models — 当前工作区的自定义模型列表（不回显 Key）。 */
export const GET = withErrorHandling(async () => {
  const user = await requireUser()

  const models = await prisma.customModel.findMany({
    where: { workspace: { members: { some: { userId: user.id } } } },
    orderBy: { createdAt: "desc" },
  })

  return jsonOk(
    models.map((model) => ({
      ...model,
      apiKey: undefined,
      hasKey: Boolean(model.apiKey || model.credentialId),
    })),
  )
})

/** POST /api/plugins/models — 新建自定义模型。 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = pluginModelSchema.parse(body)

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { isPersonal: "desc" },
  })
  if (!workspace) return jsonError("未找到可用工作区", 404)

  const model = await prisma.customModel.create({
    data: {
      workspaceId: workspace.id,
      name: input.name,
      kind: input.kind,
      lifecycle: input.lifecycle,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey || null,
      credentialId: input.credentialId || null,
      templateKey: input.templateKey || null,
      enabled: input.enabled ?? true,
      auth: input.auth as object,
      constraints: { ...(input.constraints as object), model_id: input.templateKey ?? input.name },
      submit: input.submit as object,
      edits: (input.edits ?? undefined) as Prisma.InputJsonValue | undefined,
      firstLast: (input.firstLast ?? undefined) as Prisma.InputJsonValue | undefined,
      refRegister: (input.refRegister ?? undefined) as Prisma.InputJsonValue | undefined,
      poll: (input.poll ?? undefined) as Prisma.InputJsonValue | undefined,
      extract: input.extract as object,
      result: input.result as object,
    },
  })

  return jsonOk({ id: model.id }, "模型已创建", 201)
})
