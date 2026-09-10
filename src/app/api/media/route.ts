import { prisma } from "@/lib/prisma"
import { AppError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"

export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const form = await req.formData()
  const projectId = form.get("projectId")
  const scriptId = form.get("scriptId")
  const file = form.get("file")
  if (!(file instanceof File) || (typeof projectId !== "string" && typeof scriptId !== "string"))
    throw new AppError("请选择素材，并指定项目或剧本")
  if (
    !/^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|webm))$/.test(
      file.type,
    )
  )
    throw new AppError("请选择 PNG、JPG、WebP 图片或常见视频、音频文件")
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new AppError("素材大小须在 20MB 以内")

  // 画布项目与影视工厂剧本都归属工作区；二选一作为上传落位
  let workspaceId: string
  if (typeof scriptId === "string") {
    const script = await prisma.script.findFirst({
      where: { id: scriptId, workspace: { members: { some: { userId: user.id } } } },
      select: { workspaceId: true },
    })
    if (!script) throw new AppError("剧本不存在或无权访问", 404)
    workspaceId = script.workspaceId
  } else {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId as string,
        status: { not: "deleted" },
        workspace: { members: { some: { userId: user.id } } },
      },
    })
    if (!project) throw new AppError("项目不存在或无权访问", 404)
    workspaceId = project.workspaceId
  }

  const media = await prisma.mediaFile.create({
    data: {
      workspaceId,
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
