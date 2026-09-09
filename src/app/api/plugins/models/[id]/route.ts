import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { pluginModelSchema } from "@/lib/validations/plugin"
import type { Prisma } from "@prisma/client"

async function loadModel(id: string, userId: string) {
  const model = await prisma.customModel.findFirst({
    where: { id, workspace: { members: { some: { userId } } } },
  })
  return model
}

/** GET /api/plugins/models/[id] */
export const GET = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const model = await loadModel(params.id, user.id)
  if (!model) return jsonError("模型不存在或无权访问", 404)
  return jsonOk({ ...model, apiKey: undefined, hasKey: Boolean(model.apiKey) })
})

/** PATCH /api/plugins/models/[id] */
export const PATCH = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const existing = await loadModel(params.id, user.id)
  if (!existing) return jsonError("模型不存在或无权访问", 404)

  const body = await req.json()
  const input = pluginModelSchema.parse(body)

  const updated = await prisma.customModel.update({
    where: { id: params.id },
    data: {
      name: input.name,
      kind: input.kind,
      lifecycle: input.lifecycle,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey || existing.apiKey,
      auth: input.auth as object,
      constraints: input.constraints as object,
      submit: input.submit as object,
      edits: (input.edits ?? undefined) as Prisma.InputJsonValue | undefined,
      firstLast: (input.firstLast ?? undefined) as Prisma.InputJsonValue | undefined,
      refRegister: (input.refRegister ?? undefined) as Prisma.InputJsonValue | undefined,
      poll: (input.poll ?? undefined) as Prisma.InputJsonValue | undefined,
      extract: input.extract as object,
      result: input.result as object,
      enabled: input.enabled ?? existing.enabled,
    },
  })

  return jsonOk({ id: updated.id }, "已更新")
})

/** DELETE /api/plugins/models/[id] */
export const DELETE = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const existing = await loadModel(params.id, user.id)
  if (!existing) return jsonError("模型不存在或无权访问", 404)

  await prisma.customModel.delete({ where: { id: params.id } })
  return jsonOk({ id: params.id }, "已删除")
})
