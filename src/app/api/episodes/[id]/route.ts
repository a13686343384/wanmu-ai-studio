import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const patchEpisodeSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  summary: z.string().max(1000).nullable().optional(),
  content: z.string().max(200000).optional(),
  duration: z.number().int().min(5).max(3600).optional(),
  style: z.string().max(60).nullable().optional(),
  status: z
    .enum(["draft", "outlined", "assets_ready", "storyboarded", "video_ready", "completed"])
    .optional(),
})

/** PATCH /api/episodes/[id] — 编辑分集内容 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()

    const episode = await prisma.episode.findFirst({
      where: {
        id: params.id,
        script: { workspace: { members: { some: { userId: user.id } } } },
      },
    })

    if (!episode) {
      throw Object.assign(new Error("分集不存在或无权访问"), { statusCode: 404 })
    }

    const body = await req.json()
    const input = patchEpisodeSchema.parse(body)

    const updated = await prisma.episode.update({
      where: { id: episode.id },
      data: input,
    })

    return jsonOk(
      {
        id: updated.id,
        title: updated.title,
        duration: updated.duration,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
      "已保存",
    )
  },
)
