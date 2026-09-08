import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { updateProjectSchema } from "@/lib/validations/project"

/** 校验项目归属：当前用户必须是该项目所属工作区的成员。 */
async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId } } },
    },
  })

  if (!project) {
    throw Object.assign(new Error("项目不存在或无权访问"), { statusCode: 404 })
  }

  return project
}

/** GET /api/projects/[id] */
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const project = await prisma.project.findFirst({
      where: { id: params.id, workspace: { members: { some: { userId: user.id } } } },
      include: {
        workspace: { select: { id: true, name: true, isPersonal: true } },
        canvas: true,
      },
    })

    if (!project) return jsonError("项目不存在或无权访问", 404)

    return jsonOk({
      id: project.id,
      name: project.name,
      description: project.description,
      coverImage: project.coverImage,
      folder: project.folder,
      status: project.status,
      workspaceId: project.workspaceId,
      workspaceName: project.workspace.name,
      isPersonal: project.workspace.isPersonal,
      canvas: project.canvas,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  },
)

/** PATCH /api/projects/[id] — 重命名 / 移动文件夹 / 归档 / 软删除 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    await assertProjectAccess(params.id, user.id)

    const body = await req.json()
    const input = updateProjectSchema.parse(body)

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.folder !== undefined ? { folder: input.folder } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
      },
    })

    return jsonOk(
      {
        id: project.id,
        name: project.name,
        folder: project.folder,
        status: project.status,
        updatedAt: project.updatedAt.toISOString(),
      },
      "已更新",
    )
  },
)

/** DELETE /api/projects/[id] — 软删除（可从回收站恢复） */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    await assertProjectAccess(params.id, user.id)

    await prisma.project.update({
      where: { id: params.id },
      data: { status: "deleted" },
    })

    return jsonOk({ id: params.id }, "项目已删除")
  },
)
