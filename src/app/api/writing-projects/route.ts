import { jsonOk, withErrorHandling } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import {
  requireUser,
  requireDefaultWorkspace,
  requireWorkspaceAccess,
} from "@/lib/session"
import { createWritingSchema } from "@/lib/writing/validation"
import { readWritingDocument } from "@/lib/writing/types"
export const GET = withErrorHandling(async () => {
  const user = await requireUser()
  const projects = await prisma.writingProject.findMany({
    where: { workspace: { members: { some: { userId: user.id } } } },
    orderBy: { updatedAt: "desc" },
  })
  return jsonOk(
    projects.map((project) => ({
      ...project,
      document: readWritingDocument(project.document),
    })),
  )
})
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const input = createWritingSchema.parse(await req.json())
  const workspace = input.workspaceId
    ? (await requireWorkspaceAccess(input.workspaceId)).workspace
    : await requireDefaultWorkspace(user.id)
  const project = await prisma.writingProject.create({
    data: { ...input, workspaceId: workspace.id },
  })
  return jsonOk(
    { ...project, document: readWritingDocument(project.document) },
    "剧本已创建",
    201,
  )
})
