import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { z } from "zod"

const schema = z.object({
  prompt: z.string().trim().min(2, "请描述想要的音乐风格").max(400),
  model: z.string().default("mv-audio-5.5"),
  duration: z.string().default("15s"),
  smartLyrics: z.boolean().default(false),
})

/**
 * POST /api/scripts/[id]/episodes/[episodeId]/bgm
 * 为分集生成 BGM / 配音轨道，结果写入 Episode.audioUrl。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string; episodeId: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const episode = await prisma.episode.findFirst({
      where: { id: params.episodeId, scriptId: script.id },
    })
    if (!episode) return jsonError("分集不存在", 404)

    const body = await req.json()
    const input = schema.parse(body)

    const ai = getAIService(script.workspaceId)
    const { data, usage } = await ai.generateAudio({
      prompt: input.prompt,
      model: input.model,
      duration: input.duration,
      smartLyrics: input.smartLyrics,
    })

    const updated = await prisma.episode.update({
      where: { id: episode.id },
      data: {
        audioUrl: data.audio.url,
        bgmPrompt: input.prompt,
        bgmModel: input.model,
      },
    })

    // 剧本进入后期阶段
    await prisma.script.update({
      where: { id: script.id },
      data: {
        status: "post_production",
        processingStatus: "completed",
        progress: 100,
        progressLabel: "后期处理中",
      },
    })

    return jsonOk(
      {
        episodeId: updated.id,
        audioUrl: updated.audioUrl,
        duration: data.audio.duration,
        usage,
      },
      "BGM 已生成",
      201,
    )
  },
)
