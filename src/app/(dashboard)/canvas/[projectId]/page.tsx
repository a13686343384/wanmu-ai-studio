import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CanvasStudio } from "@/components/canvas/studio/CanvasStudio"

export async function generateMetadata({
  params,
}: {
  params: { projectId: string }
}): Promise<Metadata> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { title: "画布" }

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      workspace: { members: { some: { userId: session.user.id } } },
    },
    select: { name: true },
  })

  return { title: project ? `${project.name} · 画布` : "画布" }
}

/**
 * 画布操作页（沉浸式全屏）。
 * 多模态节点创作：文本 / 图片 / 视频 / 音频 / 导演台 / 动作导演，
 * 左侧画布 / 资产栏，底部工具条，右上 Agent 与分享。
 */
export default async function CanvasProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      status: { not: "deleted" },
      workspace: { members: { some: { userId: session.user.id } } },
    },
    select: { id: true, name: true },
  })

  if (!project) notFound()

  return <CanvasStudio projectId={project.id} projectName={project.name} />
}
