import type { Script } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  AIService,
  CharacterDraft,
  SceneDraft,
  PropDraft,
} from "@/services/ai/types"
import { costumeDrafts, type AssetGenerationConfig } from "@/lib/assets/config"

export async function extractScriptAssets(
  script: Script,
  options: {
    config: AssetGenerationConfig
    imageModelName: string
    merge?: boolean
    keyword?: string
    kinds?: ("characters" | "scenes" | "props")[]
  },
  ai: AIService,
) {
  const targets = options.kinds ?? ["characters", "scenes", "props"]
  const model = options.config.textModelId
  const content = `[目标图片模型] ${options.imageModelName}。请为此模型给出具体视觉、材质、光线与构图关键词。只提取剧本有依据的资产及服饰。${options.keyword ? `重点检查：${options.keyword}` : ""}\n\n${script.content}`
  const extracted: {
    characters?: CharacterDraft[]
    scenes?: SceneDraft[]
    props?: PropDraft[]
  } = {}
  if (targets.includes("characters"))
    extracted.characters = (await ai.extractCharacters({ content, model })).data
  if (targets.includes("scenes"))
    extracted.scenes = (await ai.extractScenes({ content, model })).data
  if (targets.includes("props"))
    extracted.props = (await ai.extractProps({ content, model })).data
  const counts = { characters: 0, scenes: 0, props: 0 }
  await prisma.$transaction(async (tx) => {
    // Serialize re-entrant extraction without holding a transaction during upstream requests.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${script.id}))`
    for (const draft of extracted.characters ?? []) {
      const existing = await tx.character.findFirst({
        where: { scriptId: script.id, name: draft.name },
      })
      const fields = {
        name: draft.name,
        description: draft.description,
        appearance: draft.appearance,
        personality: draft.personality,
      }
      const character =
        existing ??
        (await tx.character.create({
          data: { ...fields, scriptId: script.id },
        }))
      if (existing && !options.merge && !existing.locked)
        await tx.character.update({ where: { id: existing.id }, data: fields })
      for (const look of costumeDrafts(draft)) {
        if (
          !(await tx.costume.findFirst({
            where: { characterId: character.id, name: look.name },
          }))
        )
          await tx.costume.create({
            data: { ...look, characterId: character.id },
          })
      }
      counts.characters++
    }
    for (const draft of extracted.scenes ?? []) {
      const existing = await tx.scene.findFirst({
        where: { scriptId: script.id, name: draft.name },
      })
      if (!existing)
        await tx.scene.create({ data: { ...draft, scriptId: script.id } })
      else if (!options.merge && !existing.locked)
        await tx.scene.update({ where: { id: existing.id }, data: draft })
      counts.scenes++
    }
    for (const draft of extracted.props ?? []) {
      const existing = await tx.prop.findFirst({
        where: { scriptId: script.id, name: draft.name },
      })
      if (!existing)
        await tx.prop.create({ data: { ...draft, scriptId: script.id } })
      else if (!options.merge && !existing.locked)
        await tx.prop.update({ where: { id: existing.id }, data: draft })
      counts.props++
    }
    // Idempotent legacy repair preserves custom or locked costumes.
    const legacy = await tx.character.findMany({
      where: { scriptId: script.id, costumes: { none: {} } },
    })
    for (const c of legacy)
      await tx.costume.create({
        data: { ...costumeDrafts(c)[0], characterId: c.id },
      })
    const current = await tx.script.findUniqueOrThrow({
      where: { id: script.id },
    })
    await tx.script.update({
      where: { id: script.id },
      data: {
        assetGenerationConfig: options.config,
        ...(["intake", "outlining", "assets"].includes(current.status)
          ? {
              status: "assets",
              processingStatus: "completed",
              progress: 100,
              progressLabel: "资产描述已提取，等待主动出图",
            }
          : {}),
      },
    })
  })
  const [characters, scenes, props] = await Promise.all([
    prisma.character.findMany({
      where: { scriptId: script.id },
      include: { costumes: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scene.findMany({
      where: { scriptId: script.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.prop.findMany({
      where: { scriptId: script.id },
      orderBy: { createdAt: "asc" },
    }),
  ])
  return { counts, characters, scenes, props, config: options.config }
}
