import { prisma } from "@/lib/prisma"
import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireDefaultWorkspace, requireUser } from "@/lib/session"
import { createProjectSchema } from "@/lib/validations/project"
import type { Prisma } from "@prisma/client"

export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  folder: string | null
  status: string
  workspaceId: string
  workspaceName: string
  isPersonal: boolean
  itemCount: number
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/projects
 * 查询参数：
 *   scope=personal|team|all   工作区类型（默认 all）
 *   workspaceId=<id>          指定工作区
 *   q=<关键字>                名称/描述模糊搜索
 *   filter=all|folder|project 仅文件夹 / 仅项目
 *   sort=updated|created      排序字段
 *   order=desc|asc            排序方向
 */
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const url = new URL(req.url)

  const scope = url.searchParams.get("scope") ?? "all"
  const workspaceId = url.searchParams.get("workspaceId")
  const q = url.searchParams.get("q")?.trim() ?? ""
  const filter = url.searchParams.get("filter") ?? "all"
  const sort = url.searchParams.get("sort") === "created" ? "createdAt" : "updatedAt"
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc"

  const where: Prisma.ProjectWhereInput = {
    status: { not: "deleted" },
    workspace: { members: { some: { userId: user.id } } },
  }

  if (workspaceId) {
    where.workspaceId = workspaceId
  } else if (scope === "personal") {
    where.workspace = { members: { some: { userId: user.id } }, isPersonal: true }
  } else if (scope === "team") {
    where.workspace = { members: { some: { userId: user.id } }, isPersonal: false }
  }

  if (filter === "folder") where.folder = { not: null }
  if (filter === "project") where.folder = null

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { [sort]: order },
    include: {
      workspace: { select: { id: true, name: true, isPersonal: true } },
      canvas: { select: { nodes: true } },
    },
  })

  const data: ProjectSummary[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    coverImage: project.coverImage,
    folder: project.folder,
    status: project.status,
    workspaceId: project.workspaceId,
    workspaceName: project.workspace.name,
    isPersonal: project.workspace.isPersonal,
    itemCount: Array.isArray(project.canvas?.nodes) ? project.canvas.nodes.length : 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }))

  return jsonOk(data)
})

/**
 * POST /api/projects
 * 新建画布项目，同时创建空的画布数据。
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = createProjectSchema.parse(body)

  const workspace = input.workspaceId
    ? await prisma.workspace.findFirst({
        where: { id: input.workspaceId, members: { some: { userId: user.id } } },
      })
    : await requireDefaultWorkspace(user.id)

  if (!workspace) {
    throw new Error("未找到可用工作区")
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description || null,
      folder: input.folder || null,
      workspaceId: workspace.id,
      creatorId: user.id,
      canvas: {
        create: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          metadata: {},
          workspaceId: workspace.id,
        },
      },
    },
    include: { workspace: { select: { id: true, name: true, isPersonal: true } } },
  })

  const data: ProjectSummary = {
    id: project.id,
    name: project.name,
    description: project.description,
    coverImage: project.coverImage,
    folder: project.folder,
    status: project.status,
    workspaceId: project.workspaceId,
    workspaceName: project.workspace.name,
    isPersonal: project.workspace.isPersonal,
    itemCount: 0,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }

  return jsonOk(data, "项目已创建", 201)
})
