import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

async function loadProject(id: string, userId: string) {
  return prisma.ecomProject.findFirst({
    where: { id, workspace: { members: { some: { userId } } } },
  })
}

/** GET /api/ecommerce/projects/[id] */
export const GET = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const project = await loadProject(params.id, user.id)
  if (!project) return jsonError("项目不存在或无权访问", 404)
  return jsonOk(project)
})

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  config: z.record(z.unknown()).optional(),
  items: z.array(z.record(z.unknown())).optional(),
  status: z.enum(["draft", "generating", "done", "failed"]).optional(),
})

/** PATCH /api/ecommerce/projects/[id] — 更新配置 / 产物 / 状态。 */
export const PATCH = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const project = await loadProject(params.id, user.id)
  if (!project) return jsonError("项目不存在或无权访问", 404)

  const body = await req.json()
  const input = patchSchema.parse(body)

  const updated = await prisma.ecomProject.update({
    where: { id: params.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.config !== undefined ? { config: input.config as object } : {}),
      ...(input.items !== undefined ? { items: input.items as object[] } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  })

  return jsonOk(updated, "已保存")
})

/** DELETE /api/ecommerce/projects/[id] */
export const DELETE = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const project = await loadProject(params.id, user.id)
  if (!project) return jsonError("项目不存在或无权访问", 404)

  await prisma.ecomProject.delete({ where: { id: params.id } })
  return jsonOk({ id: params.id }, "已删除")
})
