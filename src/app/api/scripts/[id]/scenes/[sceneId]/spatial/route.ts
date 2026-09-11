import { jsonOk, withErrorHandling, AppError } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { buildAssetPrompt } from "@/lib/asset-prompt"
import { z } from "zod"

type SpatialAngle = "overhead" | "front" | "back" | "left" | "right"

const ANGLE_LABEL: Record<SpatialAngle, string> = {
  overhead: "俯视布局（顶视图 / 空间平面布局参考）",
  front: "正向视角（正对场景主墙面）",
  back: "反向视角（背对主墙面的反向视野）",
  left: "左侧视角（从左侧看向场景中心）",
  right: "右侧视角（从右侧看向场景中心）",
}

const ANGLES: SpatialAngle[] = ["overhead", "front", "back", "left", "right"]
const SPATIAL_KEYS = [...ANGLES, "sideCard", "lightCard"] as const
type SpatialKey = (typeof SPATIAL_KEYS)[number]

const schema = z.object({
  /** 要生成的空间资产项；缺省 = 全部缺失项；all = 全部重出 */
  target: z
    .enum(["overhead", "front", "back", "left", "right", "sideCard", "lightCard", "missing", "all"])
    .default("missing"),
  imageModel: z.string().default("all-in-one"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  aspectRatio: z.string().default("9:16"),
})

function readPack(value: unknown): Partial<Record<SpatialKey, string>> {
  return value && typeof value === "object" ? (value as Partial<Record<SpatialKey, string>>) : {}
}

/**
 * POST /api/scripts/[id]/scenes/[sceneId]/spatial
 * 跨镜空间一致性资产包：多角度图（俯视 + 四向）、侧别锁定卡、光影设计卡。
 * 每种单独出，互不影响。
 */
export const POST = withErrorHandling(
  async (
    req: Request,
    { params }: { params: { id: string; sceneId: string } },
  ) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const scene = await prisma.scene.findFirst({
      where: { id: params.sceneId, scriptId: script.id },
    })
    if (!scene) throw new AppError("场景不存在", 404)

    const input = schema.parse(await req.json())
    const pack = readPack(scene.spatialPack)

    let targets: SpatialKey[]
    if (input.target === "all") {
      targets = [...SPATIAL_KEYS]
    } else if (input.target === "missing") {
      targets = SPATIAL_KEYS.filter((key) => !pack[key])
    } else {
      targets = [input.target]
    }
    if (targets.length === 0)
      return jsonOk({ pack, generated: 0 }, "空间资产包已齐全")

    const ai = getAIService(script.workspaceId)
    const context = {
      visualStyle: script.visualStyle,
      costumeStyle: script.costumeStyle,
      era: script.era,
    }
    const template = script.scenePromptTemplate?.trim()
    const withTemplate = (prompt: string) =>
      template ? `${template}\n${prompt}` : prompt

    const label =
      input.target === "sideCard"
        ? "侧别锁定卡：标注场景各墙面与方位的锁定参考图，防止跨镜头左右穿帮"
        : input.target === "lightCard"
          ? "光影设计卡：标注主光源方向、阴影走向与明暗对比的光影参考图"
          : `空间多角度参考图 · ${ANGLE_LABEL[input.target as SpatialAngle]}`

    for (const key of targets) {
      const prompt = withTemplate(
        buildAssetPrompt(
          context,
          "scene",
          `${scene.name} · ${label}`,
          scene.description,
          [scene.environment, scene.lighting].filter(Boolean).join("，"),
        ),
      )
      const { data } = await ai.generateImage({
        prompt,
        model: input.imageModel,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        references: scene.refImages.map((url) => ({ name: url, kind: "image" as const })),
      })
      pack[key] = data.images[0]!.url
    }

    const updated = await prisma.scene.update({
      where: { id: scene.id },
      data: { spatialPack: pack },
    })
    await prisma.script.update({
      where: { id: script.id },
      data: { updatedAt: new Date() },
    })

    return jsonOk({ pack: updated.spatialPack, generated: targets.length })
  },
)
