import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { shotRefsSchema } from "@/lib/storyboards/references"
import { saveStoryboardRefs } from "@/lib/storyboards/references-server"
import { AppError } from "@/lib/api"

const patchSchema = z.object({
  shotType: z.string().max(20).optional(),
  description: z.string().max(600).optional(),
  dialogue: z.string().max(600).nullable().optional(),
  action: z.string().max(600).nullable().optional(),
  camera: z.string().max(120).nullable().optional(),
  duration: z.number().min(0.5).max(120).optional(),
  /** 镜头引用（整段引用编辑保存）：场景 / 人物造型 / 道具 */
  refs: shotRefsSchema.optional(),
  revision: z.number().int().min(0).optional(),
  prompt: z.string().max(2000).nullable().optional(),
  negativePrompt: z.string().max(1000).nullable().optional(),
})

/** 校验分镜归属。 */
async function requireStoryboard(id: string, userId: string) {
  const storyboard = await prisma.storyboard.findFirst({
    where: {
      id,
      episode: { script: { workspace: { members: { some: { userId } } } } },
    },
    include: { episode: { select: { id: true, scriptId: true } } },
  })

  if (!storyboard) {
    throw new AppError("分镜不存在或无权访问", 404)
  }

  return storyboard
}

/** PATCH /api/storyboards/[id] — 编辑分镜字段 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const storyboardCurrent = await requireStoryboard(params.id, user.id)

    const body = await req.json()
    const input = patchSchema.parse(body)

    const { refs, revision, ...rest } = input
    if (refs !== undefined) {
      if (revision === undefined) throw new AppError("保存引用需要版本号", 400)
      const [storyboard] = await saveStoryboardRefs(
        user.id,
        [{ storyboardId: params.id, revision, refs }],
        undefined,
        rest,
      )
      return jsonOk(storyboard, "分镜已更新")
    }
    const storyboard = await prisma.storyboard.update({
      where: { id: params.id },
      data: rest,
    })

    return jsonOk(storyboard, "分镜已更新")
  },
)

/** DELETE /api/storyboards/[id] */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    await requireStoryboard(params.id, user.id)

    await prisma.storyboard.delete({ where: { id: params.id } })

    return jsonOk({ id: params.id }, "分镜已删除")
  },
)
