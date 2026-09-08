import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import type { Prisma } from "@prisma/client"

/**
 * POST /api/scripts/[id]/analyze
 * 触发 AI 通读剧本，返回推理结果并写回剧本元信息。
 * 这是 INTAKE 流程的第二步（第一步是 POST /api/scripts 落库）。
 */
export const POST = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const ai = getAIService()
    const { data, usage } = await ai.analyzeScript({
      title: script.title,
      content: script.content,
      workType: script.workType,
      targetAspect: script.targetAspect,
      model: script.textModel,
    })

    const updated = await prisma.script.update({
      where: { id: script.id },
      data: {
        genre: data.genre,
        narrativeStyle: data.narrativeStyle,
        visualStyle: data.visualStyle,
        costumeStyle: data.costumeStyle,
        era: data.era,
        tone: data.tone,
        allowedContent: data.allowed as Prisma.InputJsonValue,
        forbiddenContent: data.forbidden as Prisma.InputJsonValue,
        totalEpisodes: data.recommendedEpisodes,
        episodeDuration: data.recommendedDuration,
        status: "intake",
        processingStatus: "completed",
        progress: 100,
        progressLabel: "分析完成，待你审阅",
      },
      select: {
        id: true,
        title: true,
        genre: true,
        status: true,
        processingStatus: true,
        progress: true,
        progressLabel: true,
      },
    })

    return jsonOk({
      script: updated,
      analysis: data,
      usage,
    })
  },
)
