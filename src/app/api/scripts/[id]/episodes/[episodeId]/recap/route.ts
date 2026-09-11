import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { z } from "zod"

const schema = z.object({
  model: z.string().optional(),
})

/**
 * POST /api/scripts/[id]/episodes/[episodeId]/recap
 * 「先让 AI 复述理解本集」：AI 用一段话复述剧情并给出镜组节奏建议，
 * 便于创作者在拆分镜前确认理解一致。
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string; episodeId: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)

    const episode = await prisma.episode.findFirst({
      where: { id: params.episodeId, scriptId: script.id },
    })
    if (!episode) return jsonError("分集不存在", 404)

    const body = await req.json().catch(() => ({}))
    const input = schema.parse(body)

    const ai = getAIService(script.workspaceId)
    const { data, usage } = await ai.summarizeEpisode({
      episodeTitle: episode.title,
      content: episode.content,
      model: input.model ?? script.textModel,
    })

    return jsonOk({ episodeId: episode.id, ...data, usage })
  },
)
