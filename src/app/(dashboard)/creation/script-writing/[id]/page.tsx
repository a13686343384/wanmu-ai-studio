import { notFound } from "next/navigation"
import { requireUser } from "@/lib/session"
import { requireWritingProject } from "@/lib/writing/access"
import { readWritingDocument } from "@/lib/writing/types"
import { WritingEditor } from "@/components/creation/script-writing/WritingEditor"
import type { Metadata } from "next"
export const metadata: Metadata = { title: "编剧工作区" }
export default async function WritingPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()
  const project = await requireWritingProject(params.id, user.id).catch(
    () => null,
  )
  if (!project) notFound()
  return (
    <WritingEditor
      initialProject={{
        ...project,
        updatedAt: project.updatedAt.toISOString(),
        document: readWritingDocument(project.document),
      }}
    />
  )
}
