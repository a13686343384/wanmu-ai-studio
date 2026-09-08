import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CanvasEditor } from "@/components/canvas/CanvasEditor"
import { CanvasHeader } from "@/components/canvas/CanvasHeader"

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

/** 单个画布项目编辑器。 */
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
    include: { workspace: { select: { name: true, isPersonal: true } } },
  })

  if (!project) notFound()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <CanvasHeader
        projectId={project.id}
        projectName={project.name}
        workspaceName={project.workspace.name}
        isPersonal={project.workspace.isPersonal}
      />
      <div className="min-h-0 flex-1">
        <CanvasEditor projectId={project.id} />
      </div>
    </div>
  )
}
