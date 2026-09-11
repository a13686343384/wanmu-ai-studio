import { test } from "node:test"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { loadEnvConfig } from "@next/env"
import { prisma } from "../../src/lib/prisma"
import { liveAIService } from "../../src/services/ai/live-ai.service"
loadEnvConfig(process.cwd())

test("selected models, workspace boundaries, defaults and first-frame parameters reach only the intended local provider", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = ((url: any, options: any) => {
    if (!String(url).startsWith("http://127.0.0.1:"))
      throw new Error("Test forbids non-local network")
    return originalFetch(url, options)
  }) as typeof fetch
  const calls: { path: string; body: any; auth?: string }[] = []
  const server = createServer(async (req, res) => {
    let raw = ""
    for await (const part of req) raw += part
    calls.push({
      path: req.url!,
      body: JSON.parse(raw),
      auth: req.headers["x-test-auth"] as string,
    })
    res.setHeader("content-type", "application/json")
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "{}" } }],
        output: JSON.stringify({
          characters: [],
          storyboards: [{ number: 1, description: "A", duration: 3 }],
        }),
        url: "https://example.test/video.mp4",
      }),
    )
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`
  const owner = await prisma.user.findFirstOrThrow()
  const workspace = await prisma.workspace.create({
    data: { name: "model-routing-test", isPersonal: true, ownerId: owner.id },
  })
  try {
    const common = {
      workspaceId: workspace.id,
      kind: "text",
      baseUrl,
      apiKey: "test-token",
      auth: { header: "x-test-auth", scheme: "Token" },
      constraints: { model_id: "provider-A", isDefault: true },
      submit: {
        path: "/A",
        body: { model: "{{model_id}}", prompt: "{{prompt}}" },
      },
      extract: { text: ["output"] },
    }
    const a = await prisma.customModel.create({
      data: { ...common, name: "Test A" },
    })
    const b = await prisma.customModel.create({
      data: {
        ...common,
        name: "Test B",
        constraints: { model_id: "provider-B" },
        submit: { path: "/B", body: { prompt: "{{prompt}}" } },
      },
    })
    const scoped = (input: any) => ({ ...input, workspaceId: workspace.id })
    const text = await liveAIService.generateText(
      scoped({ model: a.id, prompt: "test" }),
    )
    assert.equal(calls[0].path, "/A")
    assert.equal(text.usage.model, a.id)
    assert.equal(calls[0].auth, "Token test-token")
    await liveAIService.extractCharacters(
      scoped({ model: a.id, content: "test" }),
    )
    await liveAIService.splitStoryboards(
      scoped({ model: a.id, episodeTitle: "test", content: "test" }),
    )
    assert.equal(calls.filter((x) => x.path === "/B").length, 0)
    const auto = await liveAIService.generateText(
      scoped({ model: "auto", prompt: "test" }),
    )
    assert.equal(auto.usage.model, a.id)
    await assert.rejects(
      liveAIService.generateText(scoped({ model: "missing", prompt: "test" })),
      (e: any) => e.statusCode === 400,
    )
    await assert.rejects(
      liveAIService.generateImage(
        scoped({
          model: b.id,
          prompt: "test",
          aspectRatio: "16:9",
          resolution: "1K",
        }),
      ),
      (e: any) => e.statusCode === 400,
    )
    await assert.rejects(
      liveAIService.generateText({ model: a.id, prompt: "no scope" }),
      (e: any) => e.statusCode === 400,
    )
    const video = await prisma.customModel.create({
      data: {
        ...common,
        name: "Video",
        kind: "video",
        constraints: { model_id: "video-A", max_references: 4 },
        submit: {
          path: "/video",
          body: {
            refs: "{{refs}}",
            ratio: "{{ratio}}",
            duration: "{{duration | int}}",
          },
        },
        extract: { url: ["url"] },
        transformBody: "body.refs = input.refs; return body;",
      },
    })
    await prisma.customModel.update({
      where: { id: b.id },
      data: { enabled: false },
    })
    await assert.rejects(
      liveAIService.generateText(scoped({ model: b.id, prompt: "disabled" })),
      (e: any) => e.statusCode === 400,
    )
    await assert.rejects(
      liveAIService.generateText({
        model: a.id,
        prompt: "foreign",
        workspaceId: "other-workspace",
      }),
      (e: any) => e.statusCode === 400,
    )
    const result = await liveAIService.generateVideo(
      scoped({
        model: video.id,
        prompt: "shot",
        aspectRatio: "16:9",
        resolution: "720p",
        duration: "8s",
        firstFrameUrl: "https://example.test/first.png",
        references: [
          { name: "https://example.test/first.png", kind: "image" },
          { name: "https://example.test/ref.png", kind: "image" },
        ],
      }),
    )
    const last = calls.at(-1)!
    assert.deepEqual(last.body.refs, [
      "https://example.test/first.png",
      "https://example.test/ref.png",
    ])
    assert.equal(last.body.ratio, "16:9")
    assert.equal(last.body.duration, 8)
    assert.equal(result.data.video.duration, 8)
    await prisma.customModel.update({
      where: { id: video.id },
      data: { constraints: { max_references: 0 } },
    })
    await assert.rejects(
      liveAIService.generateVideo(
        scoped({
          model: video.id,
          prompt: "shot",
          aspectRatio: "16:9",
          resolution: "720p",
          duration: "8s",
          firstFrameUrl: "https://example.test/first.png",
        }),
      ),
      (e: any) => e.statusCode === 400,
    )
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } })
    await new Promise<void>((resolve) => server.close(() => resolve()))
    globalThis.fetch = originalFetch
    await prisma.$disconnect()
  }
})
