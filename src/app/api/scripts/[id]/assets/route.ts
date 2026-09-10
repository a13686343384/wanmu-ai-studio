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
  /** 当前使用的图片模型名：拆分出的描述词将提供给该图片模型出图，让大语言模型适配它的表达 */
  imageModel: z.string().trim().max(120).optional(),
})

/**
 * POST /api/scripts/[id]/assets
 * 从剧本中提取角色 / 场景 / 道具（不生成图片，图片由 assets/generate 负责）。
 * merge=false（默认）：清空并覆盖同类资产；merge=true：只补缺失名称，不动已有内容。
 *
 * 注意：AI 调用在事务外执行，避免事务超时（默认 5s）。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json().catch(() => ({}))
    const { kinds, model, merge, keyword, imageModel } = extractSchema.parse(body)
    const targets = kinds ?? ["characters", "scenes", "props"]
    // 描述词适配（需求6）：把图片模型名告知大语言模型，让描述词与出图模型匹配
    const imageModelHint = imageModel
      ? `\n\n[目标图片模型] 这些描述词将提供给图片模型「${imageModel}」用于生成参考图，请让每条描述词兼顾该类模型的出图习惯（具体的视觉关键词、材质 / 光线 / 构图描述，中英文关键概念并给出）。`
      : ""

    const ai = getAIService()
    const result: {
      characters: number
      scenes: number
      props: number
    } = { characters: 0, scenes: 0, props: 0 }

    const keywordHint = keyword
      ? `重点捕捉这些关键词相关的内容：${keyword}。`
      : ""

    // ---- 阶段 1：AI 提取（事务外，不受超时限制）----
    interface ExtractedData {
      characters?: { name: string; description: string; appearance?: string; personality?: string }[]
      scenes?: { name: string; description: string; environment?: string; lighting?: string }[]
      props?: { name: string; description: string }[]
    }
    const extracted: ExtractedData = {}

    if (targets.includes("characters")) {
      const existingNames = new Set(
        (
          await prisma.character.findMany({
            where: { scriptId: script.id },
            select: { name: true },
          })
        ).map((item) => item.name),
      )
      const { data } = await ai.extractCharacters({
        content: merge
          ? `${script.content}${imageModelHint}\n\n[补缺漏提示] ${keywordHint}已存在角色：${[
              ...existingNames,
            ].join("、")}。只输出遗漏的新角色，不要重复已有的。`
          : `${script.content}${imageModelHint}`,
        model: model ?? script.textModel,
      })
      extracted.characters = merge
        ? data.filter((draft) => !existingNames.has(draft.name))
        : data
    }

    if (targets.includes("scenes")) {
      const { data } = await ai.extractScenes({
        content: `${script.content}${imageModelHint}`,
        model: model ?? script.textModel,
      })
      extracted.scenes = data
    }

    if (targets.includes("props")) {
      const { data } = await ai.extractProps({
        content: `${script.content}${imageModelHint}`,
        model: model ?? script.textModel,
      })
      extracted.props = data
    }

    // ---- 阶段 2：数据库写入（短事务，只做 CRUD）----
    await prisma.$transaction(async (tx) => {
      if (extracted.characters !== undefined) {
        if (!merge) await tx.character.deleteMany({ where: { scriptId: script.id } })
        await tx.character.createMany({
          data: extracted.characters.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            appearance: draft.appearance,
            personality: draft.personality,
            status: "pending",
          })),
        })
        result.characters = extracted.characters.length
      }

      if (extracted.scenes !== undefined) {
        if (!merge) await tx.scene.deleteMany({ where: { scriptId: script.id } })
        await tx.scene.createMany({
          data: extracted.scenes.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            environment: draft.environment,
            lighting: draft.lighting,
            status: "pending",
          })),
        })
        result.scenes = extracted.scenes.length
      }

      if (extracted.props !== undefined) {
        if (!merge) await tx.prop.deleteMany({ where: { scriptId: script.id } })
        await tx.prop.createMany({
          data: extracted.props.map((draft) => ({
            scriptId: script.id,
            name: draft.name,
            description: draft.description,
            status: "pending",
          })),
        })
        result.props = extracted.props.length
      }
    })

    // 妆造兜底（需求：拆分资产后妆造库应有数据）：为没有造型的角色补「默认造型」
    const charactersAll = await prisma.character.findMany({
      where: { scriptId: script.id },
      include: { costumes: { select: { id: true } } },
    })
    const missing = charactersAll.filter((c) => c.costumes.length === 0)
    if (missing.length > 0) {
      await prisma.costume.createMany({
        data: missing.map((c) => ({
          characterId: c.id,
          name: "默认造型",
          description: "角色的基础默认造型，可直接出图或在其上派生更多妆造。",
          status: "pending",
        })),
      })
    }

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
