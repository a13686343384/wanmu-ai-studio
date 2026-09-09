import { z } from "zod"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

const listSchema = z.object({
  module: z.enum(["set", "aplus"]).optional(),
})

/** GET /api/ecommerce/projects — 当前工作区的电商项目（可按 module 过滤）。 */
export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const module = new URL(req.url).searchParams.get("module") ?? undefined
  const parsed = listSchema.parse(module ? { module } : {})

  const projects = await prisma.ecomProject.findMany({
    where: {
      module: parsed.module,
      workspace: { members: { some: { userId: user.id } } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return jsonOk(projects)
})

const createSchema = z.object({
  module: z.enum(["set", "aplus"]).default("set"),
  name: z.string().trim().min(1).max(80),
  config: z.record(z.unknown()).default({}),
  items: z.array(z.record(z.unknown())).default([]),
})

/** POST /api/ecommerce/projects — 新建电商项目（套图 / A+）。 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = createSchema.parse(body)

  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { isPersonal: "desc" },
  })
  if (!workspace) return jsonError("未找到可用工作区", 404)

  const project = await prisma.ecomProject.create({
    data: {
      workspaceId: workspace.id,
      module: input.module,
      name: input.name,
      config: input.config as object,
      items: input.items as object[],
    },
  })

  return jsonOk(project, "已创建", 201)
})
