import { jsonOk, jsonError, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

/** PATCH /api/style-templates/[id] — 更新风格模板 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    await requireUser()
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name) data.name = body.name.trim()
    if (body.description !== undefined) data.description = body.description
    if (body.isDefault !== undefined) data.isDefault = body.isDefault
    if (body.templates) data.templates = body.templates

    const updated = await prisma.styleTemplate.update({
      where: { id: params.id },
      data,
    })
    return jsonOk(updated)
  },
)

/** DELETE /api/style-templates/[id] — 删除风格模板（不允许删除默认模板） */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    await requireUser()
    const template = await prisma.styleTemplate.findUnique({ where: { id: params.id } })
    if (!template) return jsonError("模板不存在", 404)
    if (template.isDefault) return jsonError("不能删除默认模板", 400)
    await prisma.styleTemplate.delete({ where: { id: params.id } })
    return jsonOk({ id: params.id }, "已删除")
  },
)
