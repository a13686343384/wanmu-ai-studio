import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

const saveCanvasSchema = z.object({
  nodes: z.array(z.record(z.unknown())).max(2000),
  edges: z.array(z.record(z.unknown())).max(4000),
  viewport: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .default({ x: 0, y: 0, zoom: 1 }),
})

/** 校验项目归属并返回其画布。 */
async function loadCanvas(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
    include: { canvas: true },
  })
  return project
}

/** GET /api/canvas/[projectId] */
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { projectId: string } }) => {
    const user = await requireUser()
    const project = await loadCanvas(params.projectId, user.id)

    if (!project) return jsonError("项目不存在或无权访问", 404)

    return jsonOk({
      projectId: project.id,
      projectName: project.name,
      nodes: project.canvas?.nodes ?? [],
      edges: project.canvas?.edges ?? [],
      viewport: project.canvas?.viewport ?? { x: 0, y: 0, zoom: 1 },
      updatedAt: (project.canvas?.updatedAt ?? project.updatedAt).toISOString(),
    })
  },
)

/** PUT /api/canvas/[projectId] — 保存节点、连线与视口 */
export const PUT = withErrorHandling(
  async (req: Request, { params }: { params: { projectId: string } }) => {
    const user = await requireUser()
    const project = await loadCanvas(params.projectId, user.id)

    if (!project) return jsonError("项目不存在或无权访问", 404)

    const body = await req.json()
    const input = saveCanvasSchema.parse(body)

    // React Flow 的节点/边是任意 JSON，交给 Prisma 存储时需显式断言为 InputJsonValue
    const nodes = input.nodes as Prisma.InputJsonValue
    const edges = input.edges as Prisma.InputJsonValue
    const viewport = input.viewport as Prisma.InputJsonValue

    const canvas = await prisma.canvas.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        workspaceId: project.workspaceId,
        nodes,
        edges,
        viewport,
      },
      update: {
        nodes,
        edges,
        viewport,
      },
    })

    // 同步刷新项目更新时间，便于列表按「最近修改」排序
    await prisma.project.update({
      where: { id: project.id },
      data: { updatedAt: new Date() },
    })

    return jsonOk(
      {
        projectId: canvas.projectId,
        nodeCount: input.nodes.length,
        edgeCount: input.edges.length,
        updatedAt: canvas.updatedAt.toISOString(),
      },
      "画布已保存",
    )
  },
)
