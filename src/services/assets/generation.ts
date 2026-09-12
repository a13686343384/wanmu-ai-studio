import { log } from "@/lib/logger"
import type { Script } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
import type { AIService } from "@/services/ai/types"
import type { AssetGenerationConfig } from "@/lib/assets/config"
import { buildAssetPrompt } from "@/lib/asset-prompt"
import { loadStyleTemplate } from "@/lib/style-templates"

type Kind = "character" | "scene" | "prop" | "outfit"
type Fields = { status: string; imageUrl?: string; prompt?: string }
const LOG_GEN = "[generation]"

export async function generateScriptAssets(
  script: Script,
  input: {
    kind: Kind
    ids?: string[]
    mode: "missing" | "all"
    config: AssetGenerationConfig
    prompt?: string
    refImages?: string[]
    quality?: string
  },
  ai: AIService,
) {
  const t0 = Date.now()
  log.info(`${LOG_GEN} 开始 | script=${script.id.slice(-6)} kind=${input.kind} mode=${input.mode} ids=${input.ids?.length ?? "all"} costumeStyle="${script.costumeStyle}"`)
  const selection = input.ids ? { id: { in: input.ids } } : {}
  const rows =
    input.kind === "character"
      ? await prisma.character.findMany({
          where: { scriptId: script.id, ...selection },
        })
      : input.kind === "scene"
        ? await prisma.scene.findMany({
            where: { scriptId: script.id, ...selection },
          })
        : input.kind === "prop"
          ? await prisma.prop.findMany({
              where: { scriptId: script.id, ...selection },
            })
          : await prisma.costume.findMany({
              where: { character: { scriptId: script.id }, ...selection },
              include: { character: { select: { name: true } } },
            })
  if (input.ids && rows.length !== new Set(input.ids).size)
    throw new AppError("资产不存在或不属于当前剧本", 404)
  // 加载风格出图模板
  const styleTemplate = await loadStyleTemplate(script.costumeStyle ?? null)
  const kindToTemplateKey = { character: "character", scene: "scene", prop: "prop", outfit: "costume" } as const
  const styleImageTpl = styleTemplate.imagePromptTemplates[kindToTemplateKey[input.kind]] || null
  const templates = {
    character: script.assetPromptTemplate,
    scene: script.scenePromptTemplate,
    prop: script.propPromptTemplate,
    outfit: script.outfitPromptTemplate,
  }
  let generated = 0,
    failed = 0,
    skipped = 0
  const errors: { id: string; name: string; error: string }[] = []
  async function write(id: string, data: Fields, claim = false) {
    const where = {
      id,
      ...(claim
        ? {
            locked: false,
            status: { not: "generating" },
            ...(input.mode === "missing" ? { imageUrl: null } : {}),
          }
        : {}),
    }
    if (input.kind === "character")
      return prisma.character.updateMany({ where, data })
    if (input.kind === "scene") return prisma.scene.updateMany({ where, data })
    if (input.kind === "prop") return prisma.prop.updateMany({ where, data })
    return prisma.costume.updateMany({ where, data })
  }
  for (const row of rows) {
    if (
      row.locked ||
      row.status === "generating" ||
      (input.mode === "missing" && row.imageUrl)
    ) {
      skipped++
      continue
    }
    if (!(await write(row.id, { status: "generating" }, true)).count) {
      skipped++
      continue
    }
    try {
      const detail =
        "appearance" in row
          ? row.appearance
          : "environment" in row
            ? [row.environment, row.lighting].filter(Boolean).join("；")
            : "situation" in row
              ? row.situation
              : undefined
      const name =
        "character" in row ? `${row.character.name} · ${row.name}` : row.name
      const prompt = [
        templates[input.kind],
        input.prompt ||
          buildAssetPrompt(
            script,
            input.kind === "outfit" ? "character" : input.kind,
            name,
            row.description,
            detail,
            styleImageTpl,
          ),
      ]
        .filter(Boolean)
        .join("\n")
      // Explicit source refs only: a generated composite reference sheet is not a face anchor.
      const refs = input.refImages ?? ("refImages" in row ? row.refImages : [])
      const { data } = await ai.generateImage({
        model: input.config.imageModelId,
        prompt,
        aspectRatio: input.config.sheetAspect,
        resolution: input.config.resolution,
        quality: input.quality
          ? ((
              { 低画质: "low", 标准画质: "medium", 高画质: "high" } as Record<
                string,
                string
              >
            )[input.quality] ?? input.quality)
          : undefined,
        workspaceId: script.workspaceId,
        references: refs.map((name) => ({ name, kind: "image" })),
      })
      const url = data.images[0]?.url
      if (!url) throw new Error("供应商未返回图片")
      await write(row.id, { imageUrl: url, prompt, status: "completed" })
      generated++
      log.info(`${LOG_GEN} ✓ 出图成功 | "${row.name}" | promptLen=${prompt.length}`)
    } catch (error) {
      await write(row.id, { status: "failed" })
      failed++
      const errMsg = error instanceof Error ? error.message : "图片生成失败"
      log.error(`${LOG_GEN} ✗ 出图失败 | "${row.name}" | ${errMsg}`)
      errors.push({
        id: row.id,
        name: row.name,
        error: errMsg,
      })
    }
  }
  await prisma.script.update({
    where: { id: script.id },
    data: { updatedAt: new Date() },
  })
  log.info(`${LOG_GEN} 完成 | 总耗时 ${Date.now() - t0}ms | kind=${input.kind} generated=${generated} failed=${failed} skipped=${skipped} total=${rows.length}`)
  return {
    kind: input.kind,
    generated,
    failed,
    skipped,
    total: rows.length,
    errors,
    modelId: input.config.imageModelId,
    config: input.config,
  }
}
