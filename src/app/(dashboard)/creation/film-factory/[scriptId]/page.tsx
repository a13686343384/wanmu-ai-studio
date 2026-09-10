import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ScriptDetailView } from "@/components/creation/film-factory/detail/ScriptDetailView"
import { toScriptSummary, type ScriptDetail } from "@/lib/serializers/script"

export async function generateMetadata({
  params,
}: {
  params: { scriptId: string }
}): Promise<Metadata> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { title: "剧本详情" }

  const script = await prisma.script.findFirst({
    where: { id: params.scriptId, workspace: { members: { some: { userId: session.user.id } } } },
    select: { title: true },
  })

  return { title: script ? script.title : "剧本详情" }
}

/** 剧本详情页（影视工厂）。 */
export default async function ScriptDetailPage({
  params,
}: {
  params: { scriptId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) notFound()

  const script = await prisma.script.findFirst({
    where: {
      id: params.scriptId,
      workspace: { members: { some: { userId: session.user.id } } },
    },
    include: {
      workspace: { select: { name: true, isPersonal: true } },
      episodes: { orderBy: { number: "asc" } },
      characters: {
        orderBy: { createdAt: "asc" },
        include: { costumes: { orderBy: { createdAt: "asc" } } },
      },
      scenes: { orderBy: { createdAt: "asc" } },
      props: { orderBy: { createdAt: "asc" } },
      consultations: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { episodes: true, characters: true, scenes: true, props: true } },
    },
  })

  if (!script) notFound()

  const detail: ScriptDetail = {
    ...toScriptSummary(script),
    content: script.content,
    era: script.era,
    tone: script.tone,
    narrativeStyle: script.narrativeStyle,
    visualStyle: script.visualStyle,
    costumeStyle: script.costumeStyle,
    allowedContent: (script.allowedContent as string[] | null) ?? null,
    forbiddenContent: (script.forbiddenContent as string[] | null) ?? null,
    processingMode: script.processingMode,
    executionMode: script.executionMode,
    textModel: script.textModel,
    consultModel: script.consultModel,
    dialogueModel: script.dialogueModel,
    episodes: script.episodes.map((episode) => ({
      id: episode.id,
      number: episode.number,
      title: episode.title,
      content: episode.content,
      summary: episode.summary,
      duration: episode.duration,
      style: episode.style,
      status: episode.status,
      audioUrl: episode.audioUrl,
      bgmPrompt: episode.bgmPrompt,
    })),
    characters: script.characters.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      prompt: item.prompt,
      status: item.status,
      locked: item.locked,
      refImages: item.refImages,
      aliases: item.aliases,
      appearance: item.appearance,
      personality: item.personality,
      costumes: item.costumes.map((costume) => ({
        id: costume.id,
        characterId: costume.characterId,
        name: costume.name,
        situation: costume.situation,
        description: costume.description,
        imageUrl: costume.imageUrl,
        prompt: costume.prompt,
        status: costume.status,
        locked: costume.locked,
      })),
    })),
    scenes: script.scenes.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      prompt: item.prompt,
      status: item.status,
      locked: item.locked,
      environment: item.environment,
      lighting: item.lighting,
    })),
    props: script.props.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      prompt: item.prompt,
      status: item.status,
      locked: item.locked,
    })),
    consultations: script.consultations.map((item) => ({
      id: item.id,
      type: item.type,
      output: item.output,
      model: item.model,
      status: item.status,
      suggestions: (item.suggestions as unknown as ScriptDetail["consultations"][number]["suggestions"]) ?? [],
      createdAt: item.createdAt.toISOString(),
    })),
  }

  return <ScriptDetailView initialScript={detail} />
}
