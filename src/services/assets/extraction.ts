import type { Script } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type {
  AIService,
  CharacterDraft,
  SceneDraft,
  PropDraft,
} from "@/services/ai/types"
import { costumeDrafts, type AssetGenerationConfig } from "@/lib/assets/config"

const LOG = "[extraction]"

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
  const t0 = Date.now()
  const targets = options.kinds ?? ["characters", "scenes", "props"]
  const model = options.config.textModelId
  const costumeStyle = script.costumeStyle ?? null
  console.log(`${LOG} 开始 | script=${script.id.slice(-6)} targets=[${targets}] model=${model} costumeStyle="${costumeStyle}" contentLen=${script.content.length} merge=${!!options.merge}`)

  const content = `[目标图片模型] ${options.imageModelName}。请为此模型给出具体视觉、材质、光线与构图关键词。只提取剧本有依据的资产及服饰。${options.keyword ? `重点检查：${options.keyword}` : ""}\n\n${script.content}`
  const extracted: {
    characters?: CharacterDraft[]
    scenes?: SceneDraft[]
    props?: PropDraft[]
  } = {}

  // ── 逐步提取，每步记录耗时 ──
  if (targets.includes("characters")) {
    const t = Date.now()
    try {
      extracted.characters = (await ai.extractCharacters({ content, model, costumeStyle })).data
      console.log(`${LOG} ← extractCharacters | ${Date.now() - t}ms | count=${extracted.characters.length} | names=[${extracted.characters.map(c => c.name).join(", ")}]`)
    } catch (err) {
      console.error(`${LOG} ✗ extractCharacters 失败 | ${Date.now() - t}ms`, err)
      throw err
    }
  }

  if (targets.includes("scenes")) {
    const t = Date.now()
    try {
      extracted.scenes = (await ai.extractScenes({ content, model, costumeStyle })).data
      console.log(`${LOG} ← extractScenes | ${Date.now() - t}ms | count=${extracted.scenes.length} | names=[${extracted.scenes.map(s => s.name).join(", ")}]`)
    } catch (err) {
      console.error(`${LOG} ✗ extractScenes 失败 | ${Date.now() - t}ms`, err)
      throw err
    }
  }

  if (targets.includes("props")) {
    const t = Date.now()
    try {
      extracted.props = (await ai.extractProps({ content, model, costumeStyle })).data
      console.log(`${LOG} ← extractProps | ${Date.now() - t}ms | count=${extracted.props.length} | names=[${extracted.props.map(p => p.name).join(", ")}]`)
    } catch (err) {
      console.error(`${LOG} ✗ extractProps 失败 | ${Date.now() - t}ms`, err)
      throw err
    }
  }

  // ── 写入数据库 ──
  const counts = { characters: 0, scenes: 0, props: 0 }
  const tDb = Date.now()
  await prisma.$transaction(async (tx) => {
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

      const costumes = costumeDrafts(draft)
      for (const look of costumes) {
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
      console.log(`${LOG}   角色入库 | "${draft.name}" | ${existing ? "更新" : "新建"} | 造型=${costumes.length}`)
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
      console.log(`${LOG}   场景入库 | "${draft.name}" | ${existing ? "更新" : "新建"}`)
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
      console.log(`${LOG}   道具入库 | "${draft.name}" | ${existing ? "更新" : "新建"}`)
    }

    // 兜底：无造型的角色补默认造型
    const legacy = await tx.character.findMany({
      where: { scriptId: script.id, costumes: { none: {} } },
    })
    for (const c of legacy) {
      await tx.costume.create({
        data: { ...costumeDrafts(c)[0], characterId: c.id },
      })
      console.log(`${LOG}   兜底造型 | "${c.name}" 补默认造型`)
    }

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
  console.log(`${LOG} DB 写入完成 | ${Date.now() - tDb}ms | 角色=${counts.characters} 场景=${counts.scenes} 道具=${counts.props}`)

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

  const totalCostumes = characters.reduce((sum, c) => sum + c.costumes.length, 0)
  console.log(`${LOG} 完成 | 总耗时 ${Date.now() - t0}ms | 角色=${counts.characters}(造型${totalCostumes}) 场景=${counts.scenes} 道具=${counts.props}`)

  return { counts, characters, scenes, props, config: options.config }
}
