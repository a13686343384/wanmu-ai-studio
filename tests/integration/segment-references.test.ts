import { test } from "node:test"
import assert from "node:assert/strict"
import {
  replaceScene,
  readShotRefs,
  getRefsRevision,
} from "../../src/lib/storyboards/references"
test("整段场景替换只修改使用原场景的镜头，保留独立场景", () => {
  const shots = [
    { sceneId: "A", cast: [], propIds: [] },
    { sceneId: "B", cast: [], propIds: [] },
  ]
  assert.deepEqual(
    shots.map((s) => replaceScene(s, "A", "C")).map((s) => s.sceneId),
    ["C", "B"],
  )
})
test("显式空引用不被默认猜选覆盖，版本可恢复", () => {
  assert.deepEqual(
    readShotRefs({ refs: { sceneId: null, cast: [], propIds: [] } }),
    { sceneId: null, cast: [], propIds: [] },
  )
  assert.equal(readShotRefs({}), null)
  assert.equal(getRefsRevision({ refsRevision: 3 }), 3)
})

test("数据库：批量保存原子性、权限、造型配对与最新生成引用", async () => {
  const { loadEnvConfig } = await import("@next/env")
  loadEnvConfig(process.cwd())
  const { prisma } = await import("../../src/lib/prisma")
  const { saveStoryboardRefs, resolveStoryboardGenerationInput } =
    await import("../../src/lib/storyboards/references-server")
  const owner = await prisma.user.create({
    data: { name: "refs isolated test" },
  })
  const outsider = await prisma.user.create({ data: { name: "refs outsider" } })
  const ws = await prisma.workspace.create({
    data: {
      name: "refs integration",
      ownerId: owner.id,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  })
  try {
    const script = await prisma.script.create({
      data: { workspaceId: ws.id, title: "refs test", content: "仅测试" },
    })
    const other = await prisma.script.create({
      data: { workspaceId: ws.id, title: "other script", content: "仅测试" },
    })
    const ep = await prisma.episode.create({
      data: { scriptId: script.id, number: 1, title: "test", content: "test" },
    })
    const seg = await prisma.segment.create({
      data: { episodeId: ep.id, order: 1, title: "段" },
    })
    const a = await prisma.scene.create({
      data: {
        scriptId: script.id,
        name: "A",
        description: "场景A",
        imageUrl: "https://example.test/a.png",
      },
    })
    const b = await prisma.scene.create({
      data: { scriptId: script.id, name: "B", description: "场景B" },
    })
    const c = await prisma.scene.create({
      data: {
        scriptId: script.id,
        name: "C",
        description: "场景C",
        refImages: ["https://example.test/c-original.png"],
      },
    })
    const foreign = await prisma.scene.create({
      data: { scriptId: other.id, name: "foreign", description: "不能引用" },
    })
    const person = await prisma.character.create({
      data: {
        scriptId: script.id,
        name: "甲",
        description: "甲",
        refImages: ["https://example.test/person.png"],
      },
    })
    const second = await prisma.character.create({
      data: { scriptId: script.id, name: "乙", description: "乙" },
    })
    const costume = await prisma.costume.create({
      data: { characterId: second.id, name: "乙服装", description: "仅乙" },
    })
    const refsA = {
      sceneId: a.id,
      cast: [{ characterId: person.id, costumeId: null }],
      propIds: [],
    }
    const refsB = { sceneId: b.id, cast: [], propIds: [] }
    const shot1 = await prisma.storyboard.create({
      data: {
        episodeId: ep.id,
        segmentId: seg.id,
        number: 1,
        description: "甲走入",
        imageUrl: "https://example.test/old.png",
        generationParams: { refs: refsA, refsRevision: 0 },
      },
    })
    const shot2 = await prisma.storyboard.create({
      data: {
        episodeId: ep.id,
        segmentId: seg.id,
        number: 2,
        description: "独立场景",
        generationParams: { refs: refsB, refsRevision: 0 },
      },
    })
    const scope = { scriptId: script.id, segmentId: seg.id }
    await assert.rejects(
      saveStoryboardRefs(
        owner.id,
        [
          {
            storyboardId: shot1.id,
            revision: 0,
            refs: { ...refsA, sceneId: foreign.id },
          },
        ],
        scope,
      ),
      /不属于/,
    )
    await assert.rejects(
      saveStoryboardRefs(
        owner.id,
        [
          {
            storyboardId: shot1.id,
            revision: 0,
            refs: {
              ...refsA,
              cast: [{ characterId: person.id, costumeId: costume.id }],
            },
          },
        ],
        scope,
      ),
      /造型不属于/,
    )
    await assert.rejects(
      saveStoryboardRefs(
        outsider.id,
        [{ storyboardId: shot1.id, revision: 0, refs: refsA }],
        scope,
      ),
      /不存在/,
    )
    await assert.rejects(
      saveStoryboardRefs(
        owner.id,
        [
          {
            storyboardId: shot1.id,
            revision: 0,
            refs: replaceScene(refsA, a.id, c.id),
          },
          { storyboardId: shot2.id, revision: 4, refs: refsB },
        ],
        scope,
      ),
      /其他操作/,
    )
    assert.equal(
      getRefsRevision(
        (await prisma.storyboard.findUniqueOrThrow({ where: { id: shot1.id } }))
          .generationParams,
      ),
      0,
    )
    await saveStoryboardRefs(
      owner.id,
      [
        {
          storyboardId: shot1.id,
          revision: 0,
          refs: replaceScene(refsA, a.id, c.id),
        },
        { storyboardId: shot2.id, revision: 0, refs: refsB },
      ],
      scope,
    )
    const reloaded = await prisma.storyboard.findMany({
      where: { episodeId: ep.id },
      orderBy: { number: "asc" },
    })
    assert.deepEqual(
      reloaded.map((s) => readShotRefs(s.generationParams)?.sceneId),
      [c.id, b.id],
    )
    assert.equal((reloaded[0].generationParams as any).outputsStale, true)
    const input = await resolveStoryboardGenerationInput(shot1.id, owner.id)
    assert.equal(input.refsRevision, 1)
    assert.deepEqual(
      input.references.map((r) => r.name),
      [
        "https://example.test/c-original.png",
        "https://example.test/person.png",
      ],
    )
    assert.match(input.prompt, /场景C/)
    assert.equal(input.firstFrameUrl, "https://example.test/old.png")
    await assert.rejects(
      saveStoryboardRefs(
        owner.id,
        [{ storyboardId: shot1.id, revision: 0, refs: refsA }],
        scope,
      ),
      /其他操作/,
    )
    const competing = await Promise.allSettled([
      saveStoryboardRefs(
        owner.id,
        [{ storyboardId: shot1.id, revision: 1, refs: refsA }],
        scope,
      ),
      saveStoryboardRefs(
        owner.id,
        [{ storyboardId: shot1.id, revision: 1, refs: refsA }],
        scope,
      ),
    ])
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1)
  } finally {
    await prisma.workspace.delete({ where: { id: ws.id } })
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, outsider.id] } },
    })
    await prisma.$disconnect()
  }
})
