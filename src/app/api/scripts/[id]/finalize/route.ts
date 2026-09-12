import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { reviewScriptSchema } from "@/lib/validations/generation"
import { extractScriptAssets } from "@/services/assets/extraction"
import { resolveAssetConfig } from "@/services/assets/config"

const LOG = "[finalize]"

/**
 * POST /api/scripts/[id]/finalize
 * INTAKE 第三步：应用用户审阅后的元信息，并用 AI 生成分集大纲。
 * 完成后异步自动提取资产（角色/场景/道具/妆造）。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const t0 = Date.now()
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    console.log(`${LOG} 开始 | script=${script.id.slice(-6)} title="${script.title}" user=${user.id.slice(-6)} ws=${script.workspaceId}`)

    const body = await req.json()
    const input = reviewScriptSchema.parse(body)
    console.log(`${LOG} 输入 | episodes=${input.totalEpisodes} duration=${input.episodeDuration}s aspect=${input.targetAspect} genre="${input.genre}" costume="${input.costumeStyle}" visual="${input.visualStyle}"`)

    // ── 第一步：生成分集大纲 ──
    console.log(`${LOG} → generateOutline 开始 | model=${script.textModel} contentLen=${script.content.length}`)
    const ai = getAIService(script.workspaceId)
    const t1 = Date.now()
    const { data: outline, usage } = await ai.generateOutline({
      scriptTitle: input.title,
      content: script.content,
      totalEpisodes: input.totalEpisodes,
      episodeDuration: input.episodeDuration,
      model: script.textModel,
    })
    console.log(`${LOG} ← generateOutline 完成 | ${Date.now() - t1}ms | episodes=${outline.episodes.length} model=${usage.model}`)

    // ── 第二步：写入数据库 ──
    const updated = await prisma.$transaction(async (tx) => {
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
    console.log(`${LOG} DB 写入完成 | ${Date.now() - t0}ms | episodes=${updated.episodes.length} status=${updated.status}`)

    // ── 第三步：异步自动提取资产 ──
    const updatedScript = await prisma.script.findUniqueOrThrow({ where: { id: updated.id } })
    void (async () => {
      const t2 = Date.now()
      try {
        console.log(`${LOG} → 自动提取资产开始 | script=${updated.id.slice(-6)} costumeStyle="${updatedScript.costumeStyle}"`)
        const aiService = getAIService(updatedScript.workspaceId)
        const { config, imageModelName } = await resolveAssetConfig(updatedScript.workspaceId, updatedScript.assetGenerationConfig)
        console.log(`${LOG}   资产配置 | textModel=${config.textModelId} imageModel=${config.imageModelId}(${imageModelName}) resolution=${config.resolution}`)

        const result = await extractScriptAssets(updatedScript, { config, imageModelName }, aiService)
        console.log(`${LOG} ← 自动提取资产完成 | ${Date.now() - t2}ms | characters=${result.counts.characters} scenes=${result.counts.scenes} props=${result.counts.props}`)

        await prisma.script.update({
          where: { id: updated.id },
          data: { status: "assets", progressLabel: "资产描述已提取，等待主动出图" },
        })
        console.log(`${LOG} 状态更新 → assets | 总耗时 ${Date.now() - t0}ms`)
      } catch (err) {
        console.error(`${LOG} ✗ 自动提取资产失败 | ${Date.now() - t2}ms | script=${updated.id.slice(-6)}`, err)
      }
    })()

    console.log(`${LOG} 响应返回 | ${Date.now() - t0}ms | 资产提取在后台继续`)
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
