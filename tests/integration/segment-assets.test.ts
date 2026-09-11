import { test } from "node:test"
import assert from "node:assert/strict"
import { runBounded } from "../../src/services/segments/assets"
test("并发有界，顺序与取消真实生效", async () => {
  let active = 0,
    max = 0,
    completed = 0
  await runBounded([1, 2, 3, 4, 5], 3, async () => {
    active++
    max = Math.max(max, active)
    await new Promise((r) => setTimeout(r, 10))
    active--
    completed++
  })
  assert.equal(max, 3)
  assert.equal(completed, 5)
  let count = 0
  await runBounded(
    [1, 2, 3],
    1,
    async () => {
      count++
    },
    () => count >= 1,
  )
  assert.equal(count, 1)
})
test("数据库：所选双模型、安全改写、前图参考和独立产物持久化", async () => {
  const { loadEnvConfig } = await import("@next/env")
  loadEnvConfig(process.cwd())
  const { prisma } = await import("../../src/lib/prisma")
  const { runSegmentAssets } =
    await import("../../src/services/segments/assets")
  const owner = await prisma.user.create({
    data: { name: "segment controlled" },
  })
  const ws = await prisma.workspace.create({
    data: {
      name: "segment controlled",
      ownerId: owner.id,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  })
  try {
    const script = await prisma.script.create({
      data: { workspaceId: ws.id, title: "segment", content: "剧本" },
    })
    const ep = await prisma.episode.create({
      data: {
        scriptId: script.id,
        number: 1,
        title: "第一集",
        content: "内容",
      },
    })
    const seg = await prisma.segment.create({
      data: { episodeId: ep.id, order: 1, title: "当前段" },
    })
    const other = await prisma.segment.create({
      data: { episodeId: ep.id, order: 2, title: "不受影响段" },
    })
    await prisma.storyboard.createMany({
      data: [1, 2, 3].map((number) => ({
        episodeId: ep.id,
        segmentId: seg.id,
        number,
        description: `镜${number}`,
        generationParams: {
          refs: { sceneId: null, cast: [], propIds: [] },
          refsRevision: 0,
        },
      })),
    })
    const untouched = await prisma.storyboard.create({
      data: {
        episodeId: ep.id,
        segmentId: other.id,
        number: 4,
        description: "不要改",
        imageUrl: "https://example.test/untouched.png",
      },
    })
    const textRequests: any[] = [],
      images: any[] = []
    const service = {
      generateText: async (input: any) => {
        textRequests.push(input)
        return {
          data: { text: `整理后:${input.prompt}` },
          usage: { tapies: 0, model: input.model },
        }
      },
      generateImage: async (input: any) => {
        images.push(input)
        return {
          data: {
            images: [{ url: `https://example.test/${images.length}.png` }],
          },
          usage: { tapies: 0, model: input.model },
        }
      },
    }
    const config = {
      textModelId: "controlled-text",
      imageModelId: "controlled-image",
      aspectRatio: "9:16" as const,
      resolution: "4K" as const,
      qualityTier: "低画质" as const,
      sequential: true,
      safeRewrite: true,
    }
    const input = {
      segmentId: seg.id,
      userId: owner.id,
      action: "fill" as const,
      config,
    }
    const result = await runSegmentAssets(input, undefined, undefined, service)
    assert.equal(result.completed, 3)
    assert.equal(result.failed, 0)
    assert.equal(textRequests.length, 3)
    assert.equal(textRequests[0].model, "controlled-text")
    assert.match(textRequests[0].prompt, /非露骨/)
    assert.equal(images[0].model, "controlled-image")
    assert.equal(images[0].aspectRatio, "9:16")
    assert.equal(images[0].resolution, "4K")
    assert.equal(images[1].references.at(-1).name, "https://example.test/1.png")
    assert.equal(images[2].references.at(-1).name, "https://example.test/2.png")
    assert.equal(
      (await runSegmentAssets(input, undefined, undefined, service)).total,
      0,
    )
    const first = await runSegmentAssets(
      { ...input, action: "firstFrame" },
      undefined,
      undefined,
      service,
    )
    const firstUrl = (first.segment.products as any).firstFrameUrl
    const plan = await runSegmentAssets(
      { ...input, action: "blockingPlan" },
      undefined,
      undefined,
      service,
    )
    assert.equal((plan.segment.products as any).firstFrameUrl, firstUrl)
    assert.notEqual((plan.segment.products as any).blockingPlanUrl, firstUrl)
    assert.match(images.at(-1).prompt, /俯视图/)
    const count = images.length
    const crowd = await runSegmentAssets(
      { ...input, action: "crowdPlan" },
      undefined,
      undefined,
      service,
    )
    assert.equal(images.length, count)
    assert.match((crowd.segment.products as any).crowdPlan, /人群调度卡/)
    const stored = await prisma.segment.findUniqueOrThrow({
      where: { id: seg.id },
    })
    assert.deepEqual(stored.config, config)
    assert.equal(
      (
        await prisma.storyboard.findUniqueOrThrow({
          where: { id: untouched.id },
        })
      ).imageUrl,
      untouched.imageUrl,
    )
    const failureService = {
      ...service,
      generateImage: async () => {
        throw new Error("受控失败")
      },
    }
    const failed = await runSegmentAssets(
      {
        ...input,
        action: "regenerate",
        config: { ...config, sequential: false },
      },
      undefined,
      undefined,
      failureService,
    )
    assert.equal(failed.failed, 3)
    assert.equal(failed.completed, 0)
    assert.equal(
      (
        await prisma.storyboard.findFirstOrThrow({
          where: { segmentId: seg.id },
          orderBy: { number: "asc" },
        })
      ).imageUrl,
      "https://example.test/1.png",
    )
  } finally {
    await prisma.workspace.delete({ where: { id: ws.id } })
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  }
})
