import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { moveProjectSchema } from "@/lib/validations/project"

/**
 * POST /api/projects/[id]/move
 * 将项目（含画布）转移到当前用户有权访问的另一个工作区。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const body = await req.json()
    const { targetWorkspaceId } = moveProjectSchema.parse(body)

    const project = await prisma.project.findFirst({
      where: { id: params.id, workspace: { members: { some: { userId: user.id } } } },
    })
    if (!project) return jsonError("项目不存在或无权访问", 404)

    const target = await prisma.workspace.findFirst({
      where: { id: targetWorkspaceId, members: { some: { userId: user.id } } },
    })
    if (!target) return jsonError("目标工作区不存在或无权访问", 403)

    if (target.id === project.workspaceId) {
      return jsonError("项目已在目标工作区中", 400)
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { id: project.id },
        data: { workspaceId: target.id },
      }),
      prisma.canvas.updateMany({
        where: { projectId: project.id },
        data: { workspaceId: target.id },
      }),
    ])

    return jsonOk({ id: project.id, workspaceId: target.id }, "已转移到新工作区")
  },
)
