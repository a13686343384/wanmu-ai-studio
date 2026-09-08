import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { splitStoryboardSchema } from "@/lib/validations/generation"

/** 校验分集归属，并返回分集与其所属剧本。 */
async function requireEpisode(scriptId: string, episodeId: string, userId: string) {
  const script = await requireScriptAccess(scriptId, userId)

  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, scriptId: script.id },
  })

  if (!episode) {
    throw Object.assign(new Error("分集不存在"), { statusCode: 404 })
  }

  return { script, episode }
}

/** GET /api/scripts/[id]/episodes/[episodeId]/storyboards */
export const GET = withErrorHandling(
  async (
    _req: Request,
    { params }: { params: { id: string; episodeId: string } },
  ) => {
    const user = await requireUser()
    const { episode } = await requireEpisode(params.id, params.episodeId, user.id)

    const storyboards = await prisma.storyboard.findMany({
      where: { episodeId: episode.id },
      orderBy: { number: "asc" },
    })

    return jsonOk({ episodeId: episode.id, storyboards })
  },
)

/**
 * POST /api/scripts/[id]/episodes/[episodeId]/storyboards
 * 拆分镜：AI 把分集剧本切为镜头列表。
 * regenerate=false 且已存在分镜时直接返回现有数据。
 */
export const POST = withErrorHandling(
  async (
    req: Request,
    { params }: { params: { id: string; episodeId: string } },
  ) => {
    const user = await requireUser()
    const { script, episode } = await requireEpisode(params.id, params.episodeId, user.id)

    const body = await req.json().catch(() => ({}))
    const input = splitStoryboardSchema.parse(body)

    const existing = await prisma.storyboard.findMany({
      where: { episodeId: episode.id },
      orderBy: { number: "asc" },
    })

    if (existing.length > 0 && !input.regenerate) {
      return jsonOk({ episodeId: episode.id, storyboards: existing, reused: true })
    }

    const ai = getAIService()
    const { data, usage } = await ai.splitStoryboards({
      episodeTitle: episode.title,
      content: episode.content,
      mode: input.mode,
      model: input.model,
    })

    if (data.storyboards.length === 0) {
      return jsonError("AI 未能拆分出镜头，请检查分集内容", 422)
    }

    const storyboards = await prisma.$transaction(async (tx) => {
      await tx.storyboard.deleteMany({ where: { episodeId: episode.id } })

      await tx.storyboard.createMany({
        data: data.storyboards.map((item) => ({
          episodeId: episode.id,
          number: item.number,
          shotType: item.shotType,
          description: item.description,
          dialogue: item.dialogue ?? null,
          action: item.action ?? null,
          camera: item.camera ?? null,
          duration: item.duration,
          status: "pending",
        })),
      })

      await tx.episode.update({
        where: { id: episode.id },
        data: { status: "storyboarded" },
      })

      // 剧本整体推进到分镜阶段
      await tx.script.update({
        where: { id: script.id },
        data: {
          status: "storyboarding",
          processingStatus: "completed",
          progress: 100,
          progressLabel: "分镜就绪",
        },
      })

      return tx.storyboard.findMany({
        where: { episodeId: episode.id },
        orderBy: { number: "asc" },
      })
    })

    return jsonOk({ episodeId: episode.id, storyboards, usage }, "拆分镜完成", 201)
  },
)
