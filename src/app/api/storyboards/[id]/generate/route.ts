import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { generateStoryboardSchema } from "@/lib/validations/generation"

/**
 * POST /api/storyboards/[id]/generate
 * 为单个分镜生成产物：
 * - kind=image → 生成分镜图
 * - kind=video → 生成视频（skipStoryboardImage=true 时免分镜图直出）
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()

    const storyboard = await prisma.storyboard.findFirst({
      where: {
        id: params.id,
        episode: { script: { workspace: { members: { some: { userId: user.id } } } } },
      },
      include: {
        episode: {
          include: {
            script: {
              select: {
                id: true,
                targetAspect: true,
                visualStyle: true,
                episodeDuration: true,
                workspaceId: true,
              },
            },
          },
        },
      },
    })

    if (!storyboard) return jsonError("分镜不存在或无权访问", 404)

    const body = await req.json()
    const input = generateStoryboardSchema.parse(body)
    const ai = getAIService()
    const script = storyboard.episode.script

    const composedPrompt = [
      script.visualStyle && `视觉风格：${script.visualStyle}`,
      `${storyboard.shotType}：${storyboard.description}`,
      storyboard.action && `动作：${storyboard.action}`,
      storyboard.camera && `运镜：${storyboard.camera}`,
      input.prompt,
    ]
      .filter(Boolean)
      .join("；")

    await prisma.storyboard.update({
      where: { id: storyboard.id },
      data: {
        status: "generating",
        prompt: composedPrompt,
        negativePrompt: input.negativePrompt ?? storyboard.negativePrompt,
        model: input.model,
      },
    })

    try {
      if (input.kind === "image") {
        const { data, usage } = await ai.generateImage({
          prompt: composedPrompt,
          negativePrompt: input.negativePrompt,
          model: input.model,
          aspectRatio: input.aspectRatio ?? script.targetAspect,
          resolution: input.resolution,
          count: 1,
          workspaceId: script.workspaceId,
        })

        const updated = await prisma.storyboard.update({
          where: { id: storyboard.id },
          data: { imageUrl: data.images[0]!.url, status: "completed" },
        })

        return jsonOk({ kind: "image", storyboard: updated, usage })
      }

      const { data, usage } = await ai.generateVideo({
        prompt: composedPrompt,
        negativePrompt: input.negativePrompt,
        model: input.model,
        aspectRatio: input.aspectRatio ?? script.targetAspect,
        resolution: input.resolution,
        workspaceId: script.workspaceId,
        duration: input.duration,
        skipStoryboardImage: input.skipStoryboardImage,
        firstFrameUrl: input.skipStoryboardImage ? undefined : storyboard.imageUrl ?? undefined,
      })

      const updated = await prisma.storyboard.update({
        where: { id: storyboard.id },
        data: {
          videoUrl: data.video.url,
          imageUrl: storyboard.imageUrl ?? data.video.poster,
          status: "completed",
        },
      })

      return jsonOk({ kind: "video", storyboard: updated, usage })
    } catch (error) {
      await prisma.storyboard.update({
        where: { id: storyboard.id },
        data: { status: "failed" },
      })
      throw error
    }
  },
)
