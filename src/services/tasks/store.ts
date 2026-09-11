import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
import type { Prisma, GenerationTask } from "@prisma/client"
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}
export async function enqueueTask(input: {
  workspaceId: string
  userId: string
  episodeId?: string
  kind: string
  payload: Prisma.InputJsonValue
  idempotencyKey: string
  total?: number
}) {
  const task = await prisma.generationTask.upsert({
    where: { idempotencyKey: `${input.workspaceId}:${input.idempotencyKey}` },
    create: {
      ...input,
      idempotencyKey: `${input.workspaceId}:${input.idempotencyKey}`,
    },
    update: {},
  })
  const identity = (x: {
    kind: string
    userId: string
    episodeId?: string | null
    payload: unknown
  }) =>
    canonical({
      kind: x.kind,
      userId: x.userId,
      episodeId: x.episodeId ?? null,
      payload: x.payload,
    })
  if (identity(task) !== identity(input))
    throw new AppError("该幂等键已用于不同任务，请使用新的请求键", 409)
  return task
}
export async function claimTask(owner: string, workspaceId?: string) {
  const task = await prisma.generationTask.findFirst({
    where: { state: "queued", ...(workspaceId ? { workspaceId } : {}) },
    orderBy: { createdAt: "asc" },
  })
  if (!task) return null
  const claimed = await prisma.generationTask.updateMany({
    where: { id: task.id, state: "queued" },
    data: {
      state: "running",
      leaseOwner: owner,
      heartbeatAt: new Date(),
      currentLabel: "执行中",
    },
  })
  return claimed.count ? { ...task, state: "running", leaseOwner: owner } : null
}
export async function cancelTask(id: string) {
  await prisma.generationTask.updateMany({
    where: { id, state: "queued" },
    data: { state: "cancelled", currentLabel: "已取消" },
  })
  await prisma.generationTask.updateMany({
    where: { id, state: "running" },
    data: {
      state: "cancel_requested",
      currentLabel: "已请求停止，当前请求收尾中",
    },
  })
  return prisma.generationTask.findUniqueOrThrow({ where: { id } })
}
export async function taskCancelled(id: string) {
  const task = await prisma.generationTask.findUnique({ where: { id } })
  return !task || !["running"].includes(task.state)
}
export async function taskProgress(
  id: string,
  completed: number,
  failed: number,
  total: number | null,
  currentLabel: string,
) {
  await prisma.generationTask.updateMany({
    where: { id, state: { in: ["running", "cancel_requested"] } },
    data: { completed, failed, total, currentLabel },
  })
}
export async function runClaimedTask(
  task: GenerationTask,
  execute: (task: GenerationTask) => Promise<Prisma.InputJsonValue>,
) {
  const heartbeat = setInterval(
    () =>
      void prisma.generationTask
        .updateMany({
          where: {
            id: task.id,
            leaseOwner: task.leaseOwner,
            state: { in: ["running", "cancel_requested"] },
          },
          data: { heartbeatAt: new Date() },
        })
        .catch(() => {}),
    10000,
  )
  try {
    const result = await execute(task)
    const current = await prisma.generationTask.findUniqueOrThrow({
      where: { id: task.id },
    })
    const state =
      current.state === "cancel_requested"
        ? "cancelled"
        : current.failed
          ? "failed"
          : "succeeded"
    await prisma.generationTask.updateMany({
      where: {
        id: task.id,
        leaseOwner: task.leaseOwner,
        state: { in: ["running", "cancel_requested"] },
      },
      data: {
        state,
        result,
        currentLabel:
          state === "succeeded"
            ? "完成"
            : state === "cancelled"
              ? "已停止"
              : "部分任务失败",
      },
    })
  } catch (error) {
    const current = await prisma.generationTask.findUnique({
      where: { id: task.id },
    })
    await prisma.generationTask.updateMany({
      where: {
        id: task.id,
        leaseOwner: task.leaseOwner,
        state: { in: ["running", "cancel_requested"] },
      },
      data: {
        state: current?.state === "cancel_requested" ? "cancelled" : "failed",
        error: error instanceof Error ? error.message : "执行失败",
        currentLabel: "任务未完成",
      },
    })
  } finally {
    clearInterval(heartbeat)
  }
}
/** Expired external requests have uncertain outcomes. Never silently replay and charge again. */
export async function recoverInterruptedTasks(workspaceId?: string) {
  const cutoff = new Date(Date.now() - 120000)
  return prisma.$transaction(async (tx) => {
    const expired = await tx.generationTask.findMany({
      where: {
        state: { in: ["running", "cancel_requested"] },
        heartbeatAt: { lt: cutoff },
        ...(workspaceId ? { workspaceId } : {}),
      },
    })
    let count = 0
    for (const task of expired) {
      const marked = await tx.generationTask.updateMany({
        where: {
          id: task.id,
          leaseOwner: task.leaseOwner,
          state: { in: ["running", "cancel_requested"] },
          heartbeatAt: { lt: cutoff },
        },
        data: {
          state: "failed",
          error: "工作进程中断，已保留完成项；确认后可重试剩余项",
          currentLabel: "执行中断",
        },
      })
      if (!marked.count) continue
      count++
      await tx.storyboard.updateMany({
        where: {
          episodeId: task.episodeId ?? undefined,
          status: "generating",
          generationParams: { path: ["taskId"], equals: task.id },
        },
        data: { status: "failed" },
      })
    }
    return { count }
  })
}
export async function requireTask(id: string, userId: string) {
  const task = await prisma.generationTask.findUnique({ where: { id } })
  if (
    !task ||
    !(await prisma.workspaceMember.findFirst({
      where: { workspaceId: task.workspaceId, userId },
    }))
  )
    throw new AppError("任务不存在或无权访问", 404)
  return task
}
export function publicTask(task: GenerationTask) {
  return {
    id: task.id,
    episodeId: task.episodeId,
    kind: task.kind,
    state: task.state,
    completed: task.completed,
    failed: task.failed,
    total: task.total,
    currentLabel: task.currentLabel,
    error: task.error,
    result: task.result,
    updatedAt: task.updatedAt,
  }
}
