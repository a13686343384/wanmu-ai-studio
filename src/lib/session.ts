import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { AppError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

/**
 * 取当前登录用户；未登录抛 401。
 * 供所有需要鉴权的 route handler 使用。
 */
export async function requireUser() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    throw new AppError("未登录或登录已过期", 401)
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError("用户不存在", 401)
  }

  return user
}

/**
 * 取当前用户可访问的工作区 id 列表（自己拥有的 + 作为成员加入的）。
 */
export async function requireWorkspaceAccess(workspaceId: string) {
  const user = await requireUser()

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    include: { workspace: true },
  })

  if (!membership) {
    throw new AppError("无权访问该工作区", 403)
  }

  return { user, workspace: membership.workspace, role: membership.role }
}

/** 取用户的默认工作区（个人工作区优先，其次最早创建的）。 */
export async function requireDefaultWorkspace(userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    orderBy: [{ isPersonal: "desc" }, { createdAt: "asc" }],
  })

  if (!workspace) {
    throw new AppError("未找到可用工作区", 404)
  }

  return workspace
}
