import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { reviewScriptSchema } from "@/lib/validations/generation"
import { extractScriptAssets } from "@/services/assets/extraction"
import { resolveAssetConfig } from "@/services/assets/config"

/**
 * POST /api/scripts/[id]/finalize
 * INTAKE 第三步：应用用户审阅后的元信息，并用 AI 生成分集大纲。
 *
 * 副作用：
 * - 更新剧本元信息与状态（intake → outlining）
 * - 生成 Episode 记录（若已存在分集则先清空再重建）
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const input = reviewScriptSchema.parse(body)

    const ai = getAIService(script.workspaceId)
    const { data: outline, usage } = await ai.generateOutline({
      scriptTitle: input.title,
      content: script.content,
      totalEpisodes: input.totalEpisodes,
      episodeDuration: input.episodeDuration,
      model: script.textModel,
    })

    const updated = await prisma.$transaction(async (tx) => {
      // 重建分集（INTAKE 阶段重复提交时保持幂等）
      await tx.episode.deleteMany({ where: { scriptId: script.id } })

      return tx.script.update({
        where: { id: script.id },
        data: {
          title: input.title,
          genre: input.genre ?? undefined,
          narrativeStyle: input.narrativeStyle ?? undefined,
          visualStyle: input.visualStyle ?? undefined,
          costumeStyle: input.costumeStyle ?? undefined,
          era: input.era ?? undefined,
          totalEpisodes: input.totalEpisodes,
          episodeDuration: input.episodeDuration,
          targetAspect: input.targetAspect,
          status: "outlining",
          processingStatus: "completed",
          progress: 100,
          progressLabel: "大纲就绪",
          episodes: {
            create: outline.episodes.map((episode) => ({
              number: episode.number,
              title: episode.title,
              summary: episode.summary,
              content: episode.content,
              duration: episode.duration,
              status: "outlined",
            })),
          },
        },
        include: {
          episodes: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true } },
        },
      })
    })

    // 异步自动提取资产（不阻塞响应，用户进入详情页时资产已就绪）
    const updatedScript = await prisma.script.findUniqueOrThrow({ where: { id: updated.id } })
    void (async () => {
      try {
        const aiService = getAIService(updatedScript.workspaceId)
        const { config, imageModelName } = await resolveAssetConfig(updatedScript.workspaceId, updatedScript.assetGenerationConfig)
        await extractScriptAssets(updatedScript, { config, imageModelName }, aiService)
        // 提取完成后更新状态
        await prisma.script.update({
          where: { id: updated.id },
          data: { status: "assets", progressLabel: "资产描述已提取，等待主动出图" },
        })
        console.log(`[finalize] 自动提取资产完成: ${updated.id}`)
      } catch (err) {
        console.error(`[finalize] 自动提取资产失败: ${updated.id}`, err)
      }
    })()

    return jsonOk(
      {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        totalEpisodes: updated.totalEpisodes,
        episodeDuration: updated.episodeDuration,
        episodes: updated.episodes,
        usage,
      },
      "剧本已创建，资产正在后台提取…",
      201,
    )
  },
)
