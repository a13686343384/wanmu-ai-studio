import { z } from "zod"
import { requireVideoReview } from "@/services/storyboards/review"
import { AppError, jsonOk, withErrorHandling } from "@/lib/api"
import { requireUser } from "@/lib/session"
import { randomUUID } from "node:crypto"
import { enqueueTask, publicTask } from "@/services/tasks/store"
import { prisma } from "@/lib/prisma"
import {
  segmentAssetActionSchema,
  segmentAssetConfigSchema,
} from "@/services/segments/assets"
async function access(id: string, segmentId: string, userId: string) {
  const segment = await prisma.segment.findFirst({
    where: {
      id: segmentId,
      episode: {
        scriptId: id,
        script: { workspace: { members: { some: { userId } } } },
      },
    },
  })
  if (!segment) throw new AppError("镜组不存在或无权访问", 404)
  return segment
}
export const GET = withErrorHandling(
  async (
    _req: Request,
    { params }: { params: { id: string; segmentId: string } },
  ) => {
    const user = await requireUser()
    const segment = await access(params.id, params.segmentId, user.id)
    const task = await prisma.generationTask.findFirst({
      where: {
        episodeId: segment.episodeId,
        kind: "segment_assets",
        state: { in: ["queued", "running", "cancel_requested"] },
        payload: { path: ["segmentId"], equals: segment.id },
      },
      orderBy: { createdAt: "desc" },
    })
    return jsonOk({ ...segment, activeTask: task ? publicTask(task) : null })
  },
)
export const POST = withErrorHandling(
  async (
    req: Request,
    { params }: { params: { id: string; segmentId: string } },
  ) => {
    const user = await requireUser()
    const segment = await access(params.id, params.segmentId, user.id)
    const body = z
      .object({
        action: segmentAssetActionSchema,
        config: segmentAssetConfigSchema,
      })
      .parse(await req.json())
    if (body.action === "fill" || body.action === "regenerate")
      await requireVideoReview(segment.episodeId)
    const script = await prisma.script.findUniqueOrThrow({
      where: { id: params.id },
    })
    const task = await enqueueTask({
      workspaceId: script.workspaceId,
      userId: user.id,
      episodeId: segment.episodeId,
      kind: "segment_assets",
      payload: {
        scriptId: script.id,
        episodeId: segment.episodeId,
        segmentId: segment.id,
        body,
      },
      idempotencyKey: req.headers.get("idempotency-key") ?? randomUUID(),
    })
    return jsonOk({ task: publicTask(task) }, "任务已排队", 202)
  },
)
