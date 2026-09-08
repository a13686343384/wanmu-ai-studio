import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { joinTeamSchema } from "@/lib/validations/workspace"

/**
 * POST /api/workspaces/join
 * 通过 32 位 Team ID 申请加入团队，等待管理员审批。
 *
 * 说明：演示环境中 Team ID 即工作区 id 去掉前缀后的大写形式；
 * 为便于体验，此处同时接受「完整工作区 id」与「32 位 Team ID」两种输入。
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const { teamId, message } = joinTeamSchema.parse(body)

  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [{ id: teamId }, { id: teamId.toLowerCase() }],
    },
  })

  if (!workspace) {
    return jsonError("Team ID 不存在，请向管理员确认", 404)
  }

  if (workspace.ownerId === user.id) {
    return jsonError("你是该团队的创建者，无需申请", 400)
  }

  const existingMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
  })
  if (existingMember) {
    return jsonError("你已经是该团队成员", 409)
  }

  const pending = await prisma.teamJoinRequest.findFirst({
    where: { workspaceId: workspace.id, userId: user.id, status: "pending" },
  })
  if (pending) {
    return jsonError("你已提交过申请，请等待管理员审批", 409)
  }

  const request = await prisma.teamJoinRequest.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      message: message || null,
    },
  })

  return jsonOk(
    { id: request.id, status: request.status, workspaceName: workspace.name },
    "申请已提交，等待管理员审批",
    201,
  )
})
