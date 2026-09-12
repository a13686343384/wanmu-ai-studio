import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import type { Prisma } from "@prisma/client"

const LOG = "[analyze]"

/**
 * POST /api/scripts/[id]/analyze
 * 触发 AI 通读剧本，返回推理结果并写回剧本元信息。
 * Body（可选）：{ detectedEpisodes: number } — 前端检测到的分集标记数量
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    // 解析可选 body
    let detectedEpisodes = 0
    try {
      const body = await req.json()
      detectedEpisodes = typeof body?.detectedEpisodes === "number" ? body.detectedEpisodes : 0
    } catch { /* body 可选，解析失败忽略 */ }

    console.log(`${LOG} 开始 | script=${script.id.slice(-6)} title="${script.title}" contentLen=${script.content.length} detectedEpisodes=${detectedEpisodes}`)

    const ai = getAIService(script.workspaceId)
    const { data, usage } = await ai.analyzeScript({
      title: script.title,
      content: script.content,
      workType: script.workType,
      targetAspect: script.targetAspect,
      model: script.textModel,
      detectedEpisodes,
    })

    console.log(`${LOG} 完成 | genre="${data.genre}" costume="${data.costumeStyle}" recommendedEpisodes=${data.recommendedEpisodes} duration=${data.recommendedDuration}s ideas=${data.episodeIdeas.length}`)

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
