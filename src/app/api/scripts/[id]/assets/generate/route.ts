import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { buildAssetPrompt } from "@/lib/asset-prompt"
import { z } from "zod"

const schema = z.object({
  aspectRatio: z.string().optional(),
  resolution: z.string().default("1K"),
  kind: z.enum(["character", "scene", "prop", "outfit"]),
  /** 为空则生成该类全部资产 */
  ids: z.array(z.string()).optional(),
  model: z.string().default("man-image-v2-lite"),
  /** 出图提示词（可改，留空 = AI 按简介自动缩写） */
  prompt: z.string().trim().max(4000).optional(),
  /** 参考图地址（可选：让 AI 照着这张图出，被造型锚定到它） */
  refImages: z.array(z.string()).max(10).optional(),
  /** 画质档位：低画质 / 标准画质 / 高画质 / 超高清画质 / 最高画质 */
  quality: z.string().optional(),
})

/**
 * POST /api/scripts/[id]/assets/generate
 * 为角色 / 场景 / 道具生成图片，结果写回对应记录的 imageUrl。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const input = schema.parse(body)

    const ai = getAIService()
    const context = {
      visualStyle: script.visualStyle,
      costumeStyle: script.costumeStyle,
      era: script.era,
    }
    // 剧本级提示词模板（查看全部信息 / 资产坞「提示词模板」设置），所有资产出图统一置入
    const template = script.assetPromptTemplate?.trim()

    const withTemplate = (prompt: string) =>
      template ? `${template}\n${prompt}` : prompt

    // 画质档位映射：内置「低画质」走轻量模型档，其余档位维持所选模型
    const resolveModel = (model: string, quality?: string) =>
      model === "all-in-one" && quality === "低画质" ? "all-in-one-low" : model

    if (input.kind === "character") {
      const items = await prisma.character.findMany({
        where: {
          scriptId: script.id,
          ...(input.ids?.length ? { id: { in: input.ids } } : {}),
        },
      })
      // 锁定（再生成不覆盖）：一键批量时跳过锁定角色；显式指定 ids 则视为用户主动覆盖
      const targets = input.ids?.length
        ? items
        : items.filter((item) => !item.locked)
      if (targets.length === 0 && items.length > 0)
        return jsonError("所选角色都已锁定，解锁后再生成", 400)
      if (targets.length === 0)
        return jsonError("没有可生成的角色，请先提取资产", 400)

      for (const item of targets) {
        await prisma.character.update({
          where: { id: item.id },
          data: { status: "generating" },
        })
        const prompt = input.prompt
          ? withTemplate(input.prompt)
          : withTemplate(
              buildAssetPrompt(
                context,
                "character",
                item.name,
                item.description,
                item.appearance,
              ),
            )
        const { data } = await ai.generateImage({
          prompt,
          model: resolveModel(input.model, input.quality),
          aspectRatio: input.aspectRatio ?? script.targetAspect,
          resolution: input.resolution,
          references: (input.refImages ?? item.refImages).map((url) => ({
            name: url,
            kind: "image" as const,
          })),
        })
        await prisma.character.update({
          where: { id: item.id },
          data: { imageUrl: data.images[0]!.url, prompt, status: "completed" },
        })
      }
      return jsonOk({ kind: "character", generated: targets.length })
    }

    if (input.kind === "scene") {
      const items = await prisma.scene.findMany({
        where: {
          scriptId: script.id,
          ...(input.ids?.length ? { id: { in: input.ids } } : {}),
        },
      })
      const targets = input.ids?.length
        ? items
        : items.filter((item) => !item.locked)
      if (targets.length === 0)
        return jsonError("没有可生成的场景，请先提取资产", 400)

      for (const item of targets) {
        await prisma.scene.update({
          where: { id: item.id },
          data: { status: "generating" },
        })
        const prompt = withTemplate(
          buildAssetPrompt(
            context,
            "scene",
            item.name,
            item.description,
            [item.environment, item.lighting].filter(Boolean).join("，"),
          ),
        )
        const { data } = await ai.generateImage({
          prompt,
          model: input.model,
          aspectRatio: input.aspectRatio ?? script.targetAspect,
          resolution: input.resolution,
        })
        await prisma.scene.update({
          where: { id: item.id },
          data: { imageUrl: data.images[0]!.url, prompt, status: "completed" },
        })
      }
      return jsonOk({ kind: "scene", generated: targets.length })
    }

    if (input.kind === "prop") {
      const items = await prisma.prop.findMany({
        where: {
          scriptId: script.id,
          ...(input.ids?.length ? { id: { in: input.ids } } : {}),
        },
        include: { parentCharacter: { select: { imageUrl: true } } },
      })
      const targets = input.ids?.length
        ? items
        : items.filter((item) => !item.locked)
      if (targets.length === 0)
        return jsonError("没有可生成的道具，请先提取资产", 400)

      for (const item of targets) {
        await prisma.prop.update({
          where: { id: item.id },
          data: { status: "generating" },
        })
        const prompt = withTemplate(
          buildAssetPrompt(context, "prop", item.name, item.description),
        )
        // 关联人物时自动挂造型脸，保证道具跨镜头一致
        const anchorRefs = item.parentCharacter?.imageUrl
          ? [{ name: item.parentCharacter.imageUrl, kind: "image" as const }]
          : []
        const { data } = await ai.generateImage({
          prompt,
          model: resolveModel(input.model, input.quality),
          aspectRatio: "1:1",
          resolution: input.resolution,
          ...(anchorRefs.length ? { references: anchorRefs } : {}),
        })
        await prisma.prop.update({
          where: { id: item.id },
          data: { imageUrl: data.images[0]!.url, prompt, status: "completed" },
        })
      }
      return jsonOk({ kind: "prop", generated: targets.length })
    }

    if (input.kind === "outfit") {
      const costumes = await prisma.costume.findMany({
        where: {
          ...(input.ids?.length ? { id: { in: input.ids } } : {}),
          character: { scriptId: script.id },
        },
        include: { character: { select: { name: true, imageUrl: true } } },
      })
      const targets = input.ids?.length
        ? costumes
        : costumes.filter((item) => !item.locked)
      if (targets.length === 0)
        return jsonError("没有可生成的造型，请先创建造型", 400)

      for (const item of targets) {
        await prisma.costume.update({
          where: { id: item.id },
          data: { status: "generating" },
        })
        const prompt = withTemplate(
          buildAssetPrompt(
            context,
            "character",
            `${item.character.name} · 造型「${item.name}」`,
            item.description,
            item.situation,
          ),
        )
        // 自动挂默认造型脸 + 该角色的关联道具图，保证多套造型一致
        const anchorRefs = [
          item.character.imageUrl,
          ...(
            await prisma.prop.findMany({
              where: { parentCharacterId: item.characterId, imageUrl: { not: null } },
              select: { imageUrl: true },
              take: 3,
            })
          ).map((prop) => prop.imageUrl),
        ].filter((url): url is string => Boolean(url))
        const { data } = await ai.generateImage({
          prompt,
          model: resolveModel(input.model, input.quality),
          aspectRatio: script.targetAspect,
          resolution: input.resolution,
          references: anchorRefs.map((url) => ({ name: url, kind: "image" as const })),
        })
        await prisma.costume.update({
          where: { id: item.id },
          data: { imageUrl: data.images[0]!.url, prompt, status: "completed" },
        })
      }
      return jsonOk({ kind: "outfit", generated: targets.length })
    }

    return jsonError("未知的资产生成类型", 400)
  },
)
