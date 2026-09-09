import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { z } from "zod"

const extractSchema = z.object({
  model: z.string().optional(),
  /** 仅提取指定类别；不传则三类都提取 */
  kinds: z.array(z.enum(["characters", "scenes", "props"])).optional(),
  /** 补缺漏模式：只新增缺失名称的资产，不删除已有内容 */
  merge: z.boolean().optional(),
  /** 补缺漏时的捕捉关键词，逗号分隔，会附加到提取提示词里重点找 */
  keyword: z.string().trim().max(200).optional(),
})

/**
 * POST /api/scripts/[id]/assets
 * 从剧本中提取角色 / 场景 / 道具（不生成图片，图片由 assets/generate 负责）。
 * merge=false（默认）：清空并覆盖同类资产；merge=true：只补缺失名称，不动已有内容。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json().catch(() => ({}))
    const { kinds, model, merge, keyword } = extractSchema.parse(body)
    const targets = kinds ?? ["characters", "scenes", "props"]

    const ai = getAIService()
    const result: {
      characters: number
      scenes: number
      props: number
    } = { characters: 0, scenes: 0, props: 0 }

    const keywordHint = keyword
      ? `重点捕捉这些关键词相关的内容：${keyword}。`
      : ""

    const pickNew = <T extends { name: string }>(
      drafts: T[],
      existingNames: Set<string>,
    ): T[] =>
      merge
        ? drafts.filter((draft) => !existingNames.has(draft.name))
        : drafts

    await prisma.$transaction(async (tx) => {
      if (targets.includes("characters")) {
        const existingNames = new Set(
          (
            await tx.character.findMany({
              where: { scriptId: script.id },
              select: { name: true },
            })
          ).map((item) => item.name),
        )
        const { data } = await ai.extractCharacters({
          content: merge
            ? `${script.content}\n\n[补缺漏提示] ${keywordHint}已存在角色：${[
                ...existingNames,
              ].join("、")}。只输出遗漏的新角色，不要重复已有的。`
            : script.content,
          model: model ?? script.textModel,
        })
        const fresh = merge
          ? data.filter((draft) => !existingNames.has(draft.name))
          : data
        if (!merge) await tx.character.deleteMany({ where: { scriptId: script.id } })
        await tx.character.createMany({
          data: fresh.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            appearance: draft.appearance,
            personality: draft.personality,
            status: "pending",
          })),
        })
        result.characters = fresh.length
      }

      if (targets.includes("scenes")) {
        const { data } = await ai.extractScenes({
          content: script.content,
          model: model ?? script.textModel,
        })
        if (!merge) await tx.scene.deleteMany({ where: { scriptId: script.id } })
        await tx.scene.createMany({
          data: data.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            environment: draft.environment,
            lighting: draft.lighting,
            status: "pending",
          })),
        })
        result.scenes = data.length
      }

      if (targets.includes("props")) {
        const { data } = await ai.extractProps({
          content: script.content,
          model: model ?? script.textModel,
        })
        if (!merge) await tx.prop.deleteMany({ where: { scriptId: script.id } })
        await tx.prop.createMany({
          data: data.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            status: "pending",
          })),
        })
        result.props = data.length
      }
    })

    const [characters, scenes, props] = await Promise.all([
      prisma.character.findMany({
        where: { scriptId: script.id },
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

    // 资产提取完成后，剧本推进到「资产就绪」阶段
    await prisma.script.update({
      where: { id: script.id },
      data: {
        status: "assets",
        processingStatus: "completed",
        progress: 100,
        progressLabel: "资产已提取",
      },
    })

    return jsonOk({
      counts: result,
      characters,
      scenes,
      props,
    })
  },
)
