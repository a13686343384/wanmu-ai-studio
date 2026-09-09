import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
export async function requireWritingProject(id: string, userId: string) {
  const project = await prisma.writingProject.findFirst({
    where: { id, workspace: { members: { some: { userId } } } },
  })
  if (!project) throw new AppError("剧本不存在或无权访问", 404)
  return project
}
