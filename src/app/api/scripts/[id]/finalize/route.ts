import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { reviewScriptSchema } from "@/lib/validations/generation"
import { extractScriptAssets } from "@/services/assets/extraction"
import { resolveAssetConfig } from "@/services/assets/config"
import { log } from "@/lib/logger"

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
    log.info(`${LOG} 开始 | script=${script.id.slice(-6)} title="${script.title}" user=${user.id.slice(-6)} ws=${script.workspaceId}`)

    const body = await req.json()
    const input = reviewScriptSchema.parse(body)
    log.info(`${LOG} 输入 | episodes=${input.totalEpisodes} duration=${input.episodeDuration}s aspect=${input.targetAspect} genre="${input.genre}" costume="${input.costumeStyle}" visual="${input.visualStyle}"`)

    // ── 第一步：生成分集大纲 ──
    log.info(`${LOG} → generateOutline 开始 | model=${script.textModel} contentLen=${script.content.length}`)
    const ai = getAIService(script.workspaceId)
    const t1 = Date.now()
    const { data: outline, usage } = await ai.generateOutline({
      scriptTitle: input.title,
      content: script.content,
      totalEpisodes: input.totalEpisodes,
      episodeDuration: input.episodeDuration,
      model: script.textModel,
    })
    log.info(`${LOG} ← generateOutline 完成 | ${Date.now() - t1}ms | episodes=${outline.episodes.length} model=${usage.model}`)

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
    log.info(`${LOG} DB 写入完成 | ${Date.now() - t0}ms | episodes=${updated.episodes.length} status=${updated.status}`)

    // ── 第三步：同步提取资产（角色/场景/道具/妆造） ──
    const t2 = Date.now()
    const updatedScript = await prisma.script.findUniqueOrThrow({ where: { id: updated.id } })
    let assetCounts = { characters: 0, scenes: 0, props: 0 }
    try {
      log.info(`${LOG} → 提取资产开始 | script=${updated.id.slice(-6)} costumeStyle="${updatedScript.costumeStyle}"`)
      const aiService = getAIService(updatedScript.workspaceId)
      const { config, imageModelName } = await resolveAssetConfig(updatedScript.workspaceId, updatedScript.assetGenerationConfig)
      log.info(`${LOG}   资产配置 | textModel=${config.textModelId} imageModel=${config.imageModelId}(${imageModelName}) resolution=${config.resolution}`)

      const result = await extractScriptAssets(updatedScript, { config, imageModelName }, aiService)
      assetCounts = result.counts
      log.info(`${LOG} ← 提取资产完成 | ${Date.now() - t2}ms | characters=${result.counts.characters} scenes=${result.counts.scenes} props=${result.counts.props}`)

      await prisma.script.update({
        where: { id: updated.id },
        data: { status: "assets", progressLabel: "资产描述已提取，等待主动出图" },
      })
    } catch (err) {
      log.error(`${LOG} ✗ 提取资产失败 | ${Date.now() - t2}ms | script=${updated.id.slice(-6)}`, err)
      // 资产提取失败不阻塞，用户可以在详情页手动重新提取
    }

    log.info(`${LOG} 全部完成 | 总耗时 ${Date.now() - t0}ms | episodes=${updated.episodes.length} 角色=${assetCounts.characters} 场景=${assetCounts.scenes} 道具=${assetCounts.props}`)
    return jsonOk(
      {
        id: updated.id,
        title: updated.title,
        status: "assets",
        totalEpisodes: updated.totalEpisodes,
        episodeDuration: updated.episodeDuration,
        episodes: updated.episodes,
        assetCounts,
        usage,
      },
      `剧本已创建 · ${assetCounts.characters} 角色 · ${assetCounts.scenes} 场景 · ${assetCounts.props} 道具`,
      201,
    )
  },
)
