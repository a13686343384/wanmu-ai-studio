export const dynamic = "force-dynamic"

import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAiMode } from "@/lib/settings"
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  AUDIO_MODELS,
  SUBTITLE_MODELS,
  type AIModel,
} from "@/lib/constants"

/**
 * GET /api/ai/models?kind=text|image|video|audio|subtitle
 *
 * 返回当前模式下可用的模型列表：
 * - mock 模式 → 内置模型清单（constants.ts）
 * - live 模式 → CustomModel 表中 enabled=true 的记录
 *
 * 不传 kind 时返回全部类型的合并列表。
 */
export const GET = withErrorHandling(async (req: Request) => {
  await requireUser()
  const kind = new URL(req.url).searchParams.get("kind")
  const mode = await getAiMode()

  if (mode === "mock") {
    return jsonOk(mockModels(kind))
  }

  // live 模式：从 CustomModel 表读取
  const user = await requireUser()
  const where: Record<string, unknown> = {
    workspace: { members: { some: { userId: user.id } } },
    enabled: true,
  }
  if (kind) where.kind = kind

  const models = await prisma.customModel.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  const list: AIModel[] = models.map((m) => ({
    id: m.id,
    name: m.name,
    cost: m.cost,
    builtIn: false,
    note: m.templateKey ?? "",
  }))

  return jsonOk(list)
})

function mockModels(kind: string | null): AIModel[] {
  const all: Record<string, readonly AIModel[]> = {
    text: TEXT_MODELS,
    image: IMAGE_MODELS,
    video: VIDEO_MODELS,
    audio: AUDIO_MODELS,
    subtitle: SUBTITLE_MODELS,
  }
  if (kind && all[kind]) return [...all[kind]!]
  return Object.values(all).flat()
}
