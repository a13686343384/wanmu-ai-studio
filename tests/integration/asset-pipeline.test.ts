import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalizeAssetConfig,
  costumeDrafts,
} from "../../src/lib/assets/config"
import { buildAssetPrompt } from "../../src/lib/asset-prompt"

test("asset configuration persists the selected models and always uses a landscape sheet independent of movie aspect", () => {
  assert.deepEqual(
    normalizeAssetConfig({
      textModel: "text-A",
      imageModel: "image-A",
      aspectRatio: "9:16",
      resolution: "2K",
    }),
    {
      textModelId: "text-A",
      imageModelId: "image-A",
      sheetAspect: "16:9",
      resolution: "2K",
    },
  )
  assert.equal(
    normalizeAssetConfig({
      textModelId: "text-A",
      imageModelId: "image-A",
      sheetAspect: "16:9",
      resolution: "4K",
    }).resolution,
    "4K",
  )
})
test("costume extraction retains story-specific looks, and legacy fallback uses known appearance", () => {
  assert.deepEqual(
    costumeDrafts({
      name: "林",
      description: "记者",
      appearance: "蓝色夹克",
      costumes: [
        { name: "夜访", description: "深色防水风衣", situation: "第2集夜访" },
      ],
    }),
    [{ name: "夜访", description: "深色防水风衣", situation: "第2集夜访" }],
  )
  assert.match(
    costumeDrafts({
      name: "林",
      description: "记者",
      appearance: "蓝色夹克",
    })[0].description,
    /蓝色夹克/,
  )
})
test("reference card preserves declared art direction and does not fabricate unknown profile facts", () => {
  const prompt = buildAssetPrompt(
    { visualStyle: "二维水彩动画", costumeStyle: null, era: null },
    "character",
    "林",
    "记者",
  )
  assert.match(prompt, /二维水彩动画/)
  assert.doesNotMatch(prompt, /photorealistic/)
  assert.match(prompt, /未设定/)
})

test("extraction writes models and distinct costumes atomically without generating media or deleting locked assets", async () => {
  const { loadEnvConfig } = await import("@next/env")
  loadEnvConfig(process.cwd())
  const { prisma } = await import("../../src/lib/prisma")
  const { extractScriptAssets } = await import(
    "../../src/services/assets/extraction"
  )
  const owner = await prisma.user.findFirstOrThrow()
  const workspace = await prisma.workspace.create({
    data: { name: "asset-pipeline-test", ownerId: owner.id },
  })
  const script = await prisma.script.create({
    data: {
      workspaceId: workspace.id,
      title: "测试资产",
      content: "主角先穿夹克，晚宴换礼服。",
    },
  })
  try {
    await prisma.character.create({
      data: {
        scriptId: script.id,
        name: "锁定角色",
        description: "原始",
        locked: true,
        imageUrl: "https://example.test/kept.png",
      },
    })
    let mediaRequests = 0
    const ai: any = {
      extractCharacters: async () => ({
        data: [
          {
            name: "主角",
            description: "记者",
            appearance: "蓝夹克",
            costumes: [
              { name: "晚宴", description: "黑礼服", situation: "晚宴" },
            ],
          },
        ],
      }),
      extractScenes: async () => ({
        data: [{ name: "大厅", description: "灯火通明" }],
      }),
      extractProps: async () => ({ data: [] }),
      generateImage: async () => {
        mediaRequests++
        throw Error("must not generate")
      },
    }
    const config = normalizeAssetConfig({
      textModelId: "text-A",
      imageModelId: "image-A",
      resolution: "2K",
    })
    await extractScriptAssets(
      script,
      { config, imageModelName: "Image Provider A", merge: true },
      ai,
    )
    await extractScriptAssets(
      script,
      { config, imageModelName: "Image Provider A", merge: true },
      ai,
    )
    assert.equal(mediaRequests, 0)
    const saved = await prisma.script.findUniqueOrThrow({
      where: { id: script.id },
      include: { characters: { include: { costumes: true } }, scenes: true },
    })
    assert.deepEqual(saved.assetGenerationConfig, config)
    assert.equal(saved.scenes.length, 1)
    assert.equal(
      saved.characters.find((c) => c.name === "锁定角色")?.imageUrl,
      "https://example.test/kept.png",
    )
    assert.equal(
      saved.characters.find((c) => c.name === "主角")?.costumes[0].description,
      "黑礼服",
    )
    assert.equal(
      saved.characters.find((c) => c.name === "主角")?.costumes.length,
      1,
    )
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.$disconnect()
  }
})

test("missing-only generation skips locked and completed assets, preserves successes and accurately counts failures", async () => {
  const { loadEnvConfig } = await import("@next/env")
  loadEnvConfig(process.cwd())
  const { prisma } = await import("../../src/lib/prisma")
  const { generateScriptAssets } = await import(
    "../../src/services/assets/generation"
  )
  const owner = await prisma.user.findFirstOrThrow()
  const workspace = await prisma.workspace.create({
    data: { name: "asset-generation-test", ownerId: owner.id },
  })
  const script = await prisma.script.create({
    data: { workspaceId: workspace.id, title: "生成测试", content: "文本" },
  })
  try {
    await prisma.scene.createMany({
      data: [
        {
          scriptId: script.id,
          name: "locked",
          description: "locked",
          locked: true,
        },
        {
          scriptId: script.id,
          name: "done",
          description: "done",
          imageUrl: "https://example.test/done.png",
        },
        { scriptId: script.id, name: "success", description: "success" },
        { scriptId: script.id, name: "failure", description: "failure" },
      ],
    })
    const calls: any[] = []
    const ai: any = {
      generateImage: async (input: any) => {
        calls.push(input)
        if (input.prompt.includes("failure"))
          throw Error("test upstream failure")
        return {
          data: { images: [{ url: "https://example.test/new.png" }] },
          usage: { model: "image-A" },
        }
      },
    }
    const config = normalizeAssetConfig({
      imageModelId: "image-A",
      textModelId: "text-A",
      resolution: "2K",
    })
    const result = await generateScriptAssets(
      script,
      { kind: "scene", mode: "missing", config },
      ai,
    )
    assert.equal(result.generated, 1)
    assert.equal(result.failed, 1)
    assert.equal(result.skipped, 2)
    assert.equal(calls.length, 2)
    assert.equal(calls[0].model, "image-A")
    assert.equal(calls[0].aspectRatio, "16:9")
    assert.equal(calls[0].resolution, "2K")
    assert.equal(
      (
        await prisma.scene.findFirstOrThrow({
          where: { scriptId: script.id, name: "failure" },
        })
      ).status,
      "failed",
    )
    const retry = await generateScriptAssets(
      script,
      { kind: "scene", mode: "missing", config },
      ai,
    )
    assert.equal(retry.generated, 0)
    assert.equal(calls.length, 3)
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await prisma.$disconnect()
  }
})
