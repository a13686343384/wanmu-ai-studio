import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { generateRequestSchema } from "@/lib/validations/generation"

/**
 * POST /api/ai/generate
 * 工作台统一生成入口：按 mediaType 分发到对应 AI 能力，并扣减积分。
 */
export const POST = withErrorHandling(async (req: Request) => {
  const user = await requireUser()
  const body = await req.json()
  const input = generateRequestSchema.parse(body)

  const ai = getAIService()

  const result =
    input.mediaType === "video"
      ? await ai.generateVideo({
          prompt: input.prompt,
          model: input.modelId,
          aspectRatio: input.aspectRatio,
          resolution: input.resolution,
          duration: input.duration,
          references: input.references,
        })
      : input.mediaType === "audio"
        ? await ai.generateAudio({
            prompt: input.prompt,
            model: input.modelId,
            duration: input.duration,
            smartLyrics: true,
          })
        : await ai.generateImage({
            prompt: input.prompt,
            model: input.modelId,
            aspectRatio: input.aspectRatio,
            resolution: input.resolution,
            count: input.count,
            style: input.style,
            references: input.references,
          })

  const cost = result.usage.tapies

  if (user.tapies < cost) {
    return jsonError(`积分不足，本次需要 ${cost}，当前余额 ${user.tapies}`, 402)
  }

  // 扣减积分（原子操作，避免并发下超扣）
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { tapies: { decrement: cost } },
    select: { tapies: true },
  })

  const media =
    input.mediaType === "video"
      ? (result.data as { video: { url: string; poster?: string; duration?: number } }).video
      : input.mediaType === "audio"
        ? (result.data as { audio: { url: string; poster?: string; duration?: number } }).audio
        : (result.data as { images: { url: string }[] }).images[0]!

  return jsonOk(
    {
      id: `gen_${Date.now().toString(36)}`,
      mediaType: input.mediaType,
      url: media.url,
      poster: "poster" in media ? media.poster : undefined,
      duration: "duration" in media ? media.duration : undefined,
      model: result.usage.model,
      cost,
      tapiesLeft: updated.tapies,
      prompt: input.prompt,
    },
    "生成成功",
  )
})
