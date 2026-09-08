import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { createWorkspaceSchema } from "@/lib/validations/workspace"
import { MAX_TEAMS_PER_USER } from "@/lib/constants"

/**
 * GET /api/workspaces
 * 返回当前用户的全部工作区（个人 + 团队）。
 */
export const GET = withErrorHandling(async () => {
  const user = await requireUser()

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: [{ isPersonal: "desc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { members: true, projects: true, scripts: true } },
      members: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
  })

  return jsonOk(
    workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      isPersonal: w.isPersonal,
      role: w.members[0]?.role ?? "member",
      memberCount: w._count.members,
      projectCount: w._count.projects,
      scriptCount: w._count.scripts,
    })),
  )
})

/**
 * POST /api/workspaces
 * 创建团队工作区。每位用户最多创建 5 个团队。
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const { name, description } = createWorkspaceSchema.parse(body)

  const teamCount = await prisma.workspace.count({
    where: { ownerId: user.id, isPersonal: false },
  })

  if (teamCount >= MAX_TEAMS_PER_USER) {
    return jsonError(`最多只能创建 ${MAX_TEAMS_PER_USER} 个团队`, 400)
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      description: description || null,
      ownerId: user.id,
      isPersonal: false,
      members: { create: { userId: user.id, role: "owner" } },
    },
    include: { _count: { select: { members: true } } },
  })

  return jsonOk(
    {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      isPersonal: workspace.isPersonal,
      role: "owner",
      memberCount: workspace._count.members,
      projectCount: 0,
      scriptCount: 0,
    },
    "团队创建成功",
    201,
  )
})
