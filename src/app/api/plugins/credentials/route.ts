import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { credentialSchema, credentialUpdateSchema } from "@/lib/validations/plugin"

/** GET /api/plugins/credentials — 凭据列表（Key 只显示尾号）。 */
export const GET = withErrorHandling(async () => {
  const user = await requireUser()
  const credentials = await prisma.credential.findMany({
    where: { workspace: { members: { some: { userId: user.id } } } },
    orderBy: { createdAt: "desc" },
  })

  return jsonOk(
    credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      baseUrl: credential.baseUrl,
      hasKey: Boolean(credential.apiKey),
      keyMask: credential.apiKey ? `****${credential.apiKey.slice(-4)}` : null,
      createdAt: credential.createdAt.toISOString(),
    })),
  )
})

/** POST /api/plugins/credentials — 新建凭据。 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = credentialSchema.parse(body)

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { isPersonal: "desc" },
  })
  if (!workspace) return jsonError("未找到可用工作区", 404)

  const credential = await prisma.credential.create({
    data: {
      workspaceId: workspace.id,
      name: input.name,
      baseUrl: input.baseUrl || null,
      apiKey: input.apiKey,
    },
  })

  return jsonOk({ id: credential.id, name: credential.name }, "凭据已创建", 201)
})

/** PATCH /api/plugins/credentials?id= — 编辑凭据（Key 留空保持不变）。 */
export const PATCH = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return jsonError("缺少凭据 id", 400)

  const existing = await prisma.credential.findFirst({
    where: { id, workspace: { members: { some: { userId: user.id } } } },
  })
  if (!existing) return jsonError("凭据不存在或无权访问", 404)

  const body = await req.json()
  const input = credentialUpdateSchema.parse(body)

  await prisma.credential.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      baseUrl: input.baseUrl ?? existing.baseUrl,
      apiKey: input.apiKey || existing.apiKey,
    },
  })

  return jsonOk({ id }, "已更新")
})

/** DELETE /api/plugins/credentials?id= */
export const DELETE = withErrorHandling(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return jsonError("缺少凭据 id", 400)

  const user = await requireUser()
  const existing = await prisma.credential.findFirst({
    where: { id, workspace: { members: { some: { userId: user.id } } } },
  })
  if (!existing) return jsonError("凭据不存在或无权访问", 404)

  await prisma.credential.delete({ where: { id } })
  return jsonOk({ id }, "已删除")
})
