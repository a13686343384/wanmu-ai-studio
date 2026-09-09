import { prisma } from "@/lib/prisma"
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const patchScriptSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  synopsis: z.string().trim().max(500).nullable().optional(),
  status: z
    .enum(["intake", "outlining", "assets", "storyboarding", "video", "post_production", "completed"])
    .optional(),
  processingStatus: z.enum(["idle", "processing", "completed", "error"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  progressLabel: z.string().max(80).nullable().optional(),
  genre: z.string().max(40).nullable().optional(),
  narrativeStyle: z.string().max(60).nullable().optional(),
  visualStyle: z.string().max(60).nullable().optional(),
  costumeStyle: z.string().max(60).nullable().optional(),
  era: z.string().max(40).nullable().optional(),
  totalEpisodes: z.number().int().min(1).max(500).optional(),
  episodeDuration: z.number().int().min(5).max(3600).optional(),
  targetAspect: z.enum(["9:16", "16:9", "1:1", "4:3", "3:4"]).optional(),
  pacingProfile: z.record(z.unknown()).nullable().optional(),
  assetPromptTemplate: z.string().trim().max(2000).nullable().optional(),
})

/** GET /api/scripts/[id] — 剧本详情（含分集与资产计数） */
export const GET = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await prisma.script.findFirst({
      where: { id: params.id, workspace: { members: { some: { userId: user.id } } } },
      include: {
        workspace: { select: { name: true, isPersonal: true } },
        episodes: { orderBy: { number: "asc" } },
        characters: {
          orderBy: { createdAt: "asc" },
          include: { costumes: { orderBy: { createdAt: "asc" } } },
        },
        scenes: { orderBy: { createdAt: "asc" } },
        props: { orderBy: { createdAt: "asc" } },
        consultations: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!script) return jsonError("剧本不存在或无权访问", 404)

    return jsonOk({
      ...script,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
      episodes: script.episodes.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      characters: script.characters.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      scenes: script.scenes.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      props: script.props.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      consultations: script.consultations.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    })
  },
)

/** PATCH /api/scripts/[id] — 更新标题、状态、进度或元信息 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    await requireScriptAccess(params.id, user.id)

    const body = await req.json()
    const input = patchScriptSchema.parse(body)

    const script = await prisma.script.update({
      where: { id: params.id },
      data: input as Prisma.ScriptUncheckedUpdateInput,
    })

    return jsonOk(
      {
        id: script.id,
        title: script.title,
        status: script.status,
        processingStatus: script.processingStatus,
        progress: script.progress,
        progressLabel: script.progressLabel,
        updatedAt: script.updatedAt.toISOString(),
      },
      "已更新",
    )
  },
)

/** DELETE /api/scripts/[id] */
export const DELETE = withErrorHandling(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    await requireScriptAccess(params.id, user.id)

    await prisma.script.delete({ where: { id: params.id } })

    return jsonOk({ id: params.id }, "剧本已删除")
  },
)
