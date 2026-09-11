import { jsonOk, jsonError, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

/** GET /api/style-templates — 列出所有风格模板（全局预设 + 当前用户自定义） */
export const GET = withErrorHandling(async () => {
  await requireUser()
  const templates = await prisma.styleTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  })
  return jsonOk(templates)
})

/** POST /api/style-templates — 创建自定义风格模板 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const { name, description, templates } = body
  if (!name?.trim()) return jsonError("名称不能为空", 400)
  if (!templates?.extractionTemplates || !templates?.imagePromptTemplates)
    return jsonError("模板数据不完整", 400)

  // 查找当前用户的默认工作区
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  })
  const workspaceId = membership?.workspaceId ?? "__global__"

  const created = await prisma.styleTemplate.create({
    data: { name: name.trim(), description: description ?? "", templates, workspaceId },
  })
  return jsonOk(created, "风格模板已创建", 201)
})
