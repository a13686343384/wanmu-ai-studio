import { prisma } from "@/lib/prisma"
import { AppError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const form = await req.formData()
  const projectId = form.get("projectId")
  const file = form.get("file")
  if (typeof projectId !== "string" || !(file instanceof File))
    throw new AppError("请选择素材与项目")
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      status: { not: "deleted" },
      workspace: { members: { some: { userId: user.id } } },
    },
  })
  if (!project) throw new AppError("项目不存在或无权访问", 404)
  if (
    !/^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|webm))$/.test(
      file.type,
    )
  )
    throw new AppError("请选择 PNG、JPG、WebP 图片或常见视频、音频文件")
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new AppError("素材大小须在 20MB 以内")
  const media = await prisma.mediaFile.create({
    data: {
      workspaceId: project.workspaceId,
      name: file.name.slice(0, 200),
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    },
    select: { id: true },
  })
  return jsonOk({ url: `/api/media/${media.id}` }, "上传成功", 201)
})

export const GET = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const projectId = new URL(req.url).searchParams.get("projectId")
  if (!projectId) throw new AppError("缺少项目")
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId: user.id } } },
    },
    include: { workspace: { select: { name: true, isPersonal: true } } },
  })
  if (!project) throw new AppError("项目不存在或无权访问", 404)
  const files = await prisma.mediaFile.findMany({
    where: { workspaceId: project.workspaceId },
    select: { id: true, name: true, mimeType: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return jsonOk({
    workspace: project.workspace,
    files: files.map((file) => ({ ...file, url: `/api/media/${file.id}` })),
  })
})
