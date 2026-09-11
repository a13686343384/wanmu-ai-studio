import { loadEnvConfig } from "@next/env"
import { test } from "node:test"
import assert from "node:assert/strict"
import { prisma } from "../../src/lib/prisma"
import {
  enqueueTask,
  recoverInterruptedTasks,
} from "../../src/services/tasks/store"
loadEnvConfig(process.cwd())
test("same idempotency key only reuses identical work, rejects different payload or kind", async () => {
  const workspaceId = crypto.randomUUID(),
    userId = crypto.randomUUID(),
    idempotencyKey = "same-request"
  try {
    const a = await enqueueTask({
      workspaceId,
      userId,
      idempotencyKey,
      kind: "split",
      payload: { a: 1, b: { x: 2, y: 3 } },
    })
    assert.equal(
      (
        await enqueueTask({
          workspaceId,
          userId,
          idempotencyKey,
          kind: "split",
          payload: { b: { y: 3, x: 2 }, a: 1 },
        })
      ).id,
      a.id,
    )
    await assert.rejects(
      enqueueTask({
        workspaceId,
        userId,
        idempotencyKey,
        kind: "video_batch",
        payload: { a: 1, b: { x: 2, y: 3 } },
      }),
      (e: any) => e.statusCode === 409,
    )
    await assert.rejects(
      enqueueTask({
        workspaceId,
        userId,
        idempotencyKey,
        kind: "split",
        payload: { a: 2, b: { x: 2, y: 3 } },
      }),
      (e: any) => e.statusCode === 409,
    )
  } finally {
    await prisma.generationTask.deleteMany({ where: { workspaceId } })
    await prisma.$disconnect()
  }
})
test("interrupted task releases only its own generating shots and preserves completed files", async () => {
  const user = await prisma.user.findFirstOrThrow()
  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, name: "recovery-test" },
  })
  const script = await prisma.script.create({
    data: {
      workspaceId: workspace.id,
      title: "恢复测试",
      content: "文本",
      episodes: { create: { number: 1, title: "第1集", content: "正文" } },
    },
    include: { episodes: true },
  })
  try {
    const task = await enqueueTask({
      workspaceId: workspace.id,
      userId: user.id,
      episodeId: script.episodes[0].id,
      idempotencyKey: crypto.randomUUID(),
      kind: "video_batch",
      payload: {},
    })
    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        state: "running",
        leaseOwner: "dead-worker",
        heartbeatAt: new Date(Date.now() - 180000),
      },
    })
    const interrupted = await prisma.storyboard.create({
      data: {
        episodeId: script.episodes[0].id,
        number: 1,
        description: "中断",
        status: "generating",
        videoUrl: "https://example.test/old.mp4",
        generationParams: { taskId: task.id, requestId: "old" },
      },
    })
    const other = await prisma.storyboard.create({
      data: {
        episodeId: script.episodes[0].id,
        number: 2,
        description: "另一请求",
        status: "generating",
        generationParams: { taskId: "other-task", requestId: "new" },
      },
    })
    await recoverInterruptedTasks(workspace.id)
    assert.equal(
      (
        await prisma.generationTask.findUniqueOrThrow({
          where: { id: task.id },
        })
      ).state,
      "failed",
    )
    const shot = await prisma.storyboard.findUniqueOrThrow({
      where: { id: interrupted.id },
    })
    assert.equal(shot.status, "failed")
    assert.equal(shot.videoUrl, "https://example.test/old.mp4")
    assert.equal(
      (await prisma.storyboard.findUniqueOrThrow({ where: { id: other.id } }))
        .status,
      "generating",
    )
  } finally {
    await prisma.generationTask.deleteMany({
      where: { workspaceId: workspace.id },
    })
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.$disconnect()
  }
})
