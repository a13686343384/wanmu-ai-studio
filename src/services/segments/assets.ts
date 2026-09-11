import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { AppError } from "@/lib/api"
import { getAIService, type AIService } from "@/services/ai"
import { getRefsRevision, readShotRefs } from "@/lib/storyboards/references"
import { resolveStoryboardGenerationInput } from "@/lib/storyboards/references-server"
import {
  segmentAssetConfigSchema,
  type SegmentAssetConfig,
  type SegmentAssetAction,
} from "@/lib/storyboards/segment-assets"
export {
  segmentAssetConfigSchema,
  segmentAssetActionSchema,
} from "@/lib/storyboards/segment-assets"
export async function runBounded<T>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<void>,
  cancelled: () => boolean | Promise<boolean> = () => false,
) {
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        if (await cancelled()) return
        const index = cursor++
        if (index >= items.length) return
        await run(items[index], index)
      }
    }),
  )
}
export async function runSegmentAssets(
  input: {
    segmentId: string
    userId: string
    action: SegmentAssetAction
    config: SegmentAssetConfig
  },
  onProgress?: (p: {
    completed: number
    failed: number
    total: number
    currentLabel: string
  }) => void | Promise<void>,
  isCancelled: () => boolean | Promise<boolean> = () => false,
  service?: Pick<AIService, "generateText" | "generateImage">,
) {
  const config = segmentAssetConfigSchema.parse(input.config)
  const segment = await prisma.segment.findFirst({
    where: {
      id: input.segmentId,
      episode: {
        script: { workspace: { members: { some: { userId: input.userId } } } },
      },
    },
    include: {
      episode: { include: { script: true } },
      storyboards: { orderBy: { number: "asc" } },
    },
  })
  if (!segment) throw new AppError("镜组不存在或无权访问", 404)
  if (!segment.storyboards.length) throw new AppError("本段没有分镜", 400)
  const script = segment.episode.script
  const ai = service ?? getAIService(script.workspaceId)
  await prisma.segment.update({ where: { id: segment.id }, data: { config } })
  const shots =
    input.action === "fill"
      ? segment.storyboards.filter(
          (s) =>
            !s.imageUrl ||
            (s.generationParams as { outputsStale?: boolean } | null)
              ?.outputsStale,
        )
      : input.action === "regenerate"
        ? segment.storyboards
        : [segment.storyboards[0]]
  const usage: {
    tapies: number
    model: string
    storyboardId: string
    kind: string
  }[] = []
  let completed = 0,
    failed = 0
  const failures: { storyboardId: string; error: string }[] = []
  const generated = new Map<string, string>()
  const progress = async (label: string) => {
    await onProgress?.({
      completed,
      failed,
      total: shots.length,
      currentLabel: label,
    })
  }
  await progress("等待生成")
  await runBounded(
    shots,
    config.sequential ? 1 : 3,
    async (shot) => {
      await progress(`正在生成分镜 ${shot.number}`)
      try {
        const resolved = await resolveStoryboardGenerationInput(
          shot.id,
          input.userId,
        )
        const summary = segment.storyboards
          .map((s) => `第${s.number}镜：${s.description}`)
          .join("\n")
        const purpose =
          input.action === "blockingPlan"
            ? "生成本段空间调度俯视图提示词。明确机位、轴线、人物位置与运动箭头，不要生成首镜截图。"
            : input.action === "crowdPlan"
              ? "生成本段人群调度卡文本：群演数量、景深层次、移动方向、遮挡规则；剧情不需要人群时明确写不需要并说明依据。"
              : input.action === "firstFrame"
                ? "编写本段入口首帧画面提示词，建立空间关系。"
                : "将镜头信息整理为准确的画面提示词，保留人物与场景事实。"
        const rewritten = await ai.generateText({
          model: config.textModelId,
          workspaceId: script.workspaceId,
          prompt: [
            purpose,
            `剧本视觉风格：${script.visualStyle ?? "跟随剧本"}`,
            resolved.prompt,
            input.action === "fill" || input.action === "regenerate"
              ? ""
              : summary,
            config.safeRewrite
              ? "将露骨血腥或暴力细节改为非露骨、克制的镜头表达，遵守供应商规范；保留剧情事实，不增加事件。"
              : "保留原文表达，不添加剧情。",
          ]
            .filter(Boolean)
            .join("\n"),
        })
        usage.push({ ...rewritten.usage, storyboardId: shot.id, kind: "text" })
        if (await isCancelled()) return
        if (!rewritten.data.text.trim())
          throw new AppError("文本模型未返回有效提示词", 502)
        let url: string | undefined
        if (input.action !== "crowdPlan") {
          const refs = [...resolved.references]
          if (
            config.sequential &&
            (input.action === "fill" || input.action === "regenerate")
          ) {
            const at = segment.storyboards.findIndex((s) => s.id === shot.id)
            const previous = segment.storyboards[at - 1]
            if (
              previous &&
              readShotRefs(previous.generationParams)?.sceneId ===
                readShotRefs(shot.generationParams)?.sceneId
            ) {
              const previousUrl =
                generated.get(previous.id) ??
                (shots.some((s) => s.id === previous.id)
                  ? null
                  : previous.imageUrl)
              if (previousUrl && !refs.some((r) => r.name === previousUrl))
                refs.push({ name: previousUrl, kind: "image" })
            }
          }
          const image = await ai.generateImage({
            model: config.imageModelId,
            workspaceId: script.workspaceId,
            prompt: rewritten.data.text,
            aspectRatio: config.aspectRatio,
            resolution: config.resolution,
            references: refs,
            count: 1,
            style: script.visualStyle,
          })
          usage.push({ ...image.usage, storyboardId: shot.id, kind: "image" })
          url = image.data.images[0]?.url
          if (!url) throw new AppError("图片模型未返回图片", 502)
        }
        // 供应商不可取消时收尾等待，但不再将旧结果写入新版本。
        if (await isCancelled()) return
        await prisma.$transaction(async (tx) => {
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM "Storyboard" WHERE id=${shot.id} FOR UPDATE`,
          )
          const current = await tx.storyboard.findUniqueOrThrow({
            where: { id: shot.id },
          })
          if (
            getRefsRevision(current.generationParams) !==
              resolved.refsRevision ||
            current.description !== shot.description
          )
            throw new AppError("分镜或引用已改变，本次产物未覆盖新版本", 409)
          if (input.action === "fill" || input.action === "regenerate") {
            await tx.storyboard.update({
              where: { id: shot.id },
              data: {
                imageUrl: url,
                status: "completed",
                model: config.imageModelId,
                generationParams: {
                  ...((current.generationParams as Record<
                    string,
                    Prisma.InputJsonValue
                  >) ?? {}),
                  generatedRefsRevision: resolved.refsRevision,
                  generationInputSummary: resolved.inputSummary,
                  outputsStale: false,
                  segmentAssetConfig: config,
                },
              },
            })
          } else {
            await tx.$queryRaw(
              Prisma.sql`SELECT id FROM "Segment" WHERE id=${segment.id} FOR UPDATE`,
            )
            const currentShots = await tx.storyboard.findMany({
              where: { segmentId: segment.id },
            })
            if (
              currentShots.length !== segment.storyboards.length ||
              segment.storyboards.some((s) => {
                const fresh = currentShots.find((v) => v.id === s.id)
                return (
                  !fresh ||
                  fresh.description !== s.description ||
                  getRefsRevision(fresh.generationParams) !==
                    getRefsRevision(s.generationParams)
                )
              })
            )
              throw new AppError("镜组内容已改变，本次段资产未覆盖新版本", 409)
            const latest = await tx.segment.findUniqueOrThrow({
              where: { id: segment.id },
            })
            const key =
              input.action === "firstFrame"
                ? "firstFrameUrl"
                : input.action === "blockingPlan"
                  ? "blockingPlanUrl"
                  : "crowdPlan"
            await tx.segment.update({
              where: { id: segment.id },
              data: {
                products: {
                  ...((latest.products as Record<
                    string,
                    Prisma.InputJsonValue
                  >) ?? {}),
                  [key]: url ?? rewritten.data.text,
                  [`${key}Meta`]: {
                    modelId:
                      input.action === "crowdPlan"
                        ? config.textModelId
                        : config.imageModelId,
                    refsRevision: resolved.refsRevision,
                    createdAt: new Date().toISOString(),
                  },
                },
              },
            })
          }
          await tx.script.update({
            where: { id: script.id },
            data: { updatedAt: new Date() },
          })
        })
        if (url) generated.set(shot.id, url)
        completed++
      } catch (error) {
        failed++
        failures.push({
          storyboardId: shot.id,
          error: error instanceof Error ? error.message : "生成失败",
        })
      }
      await progress(failed ? "部分生成失败" : "生成完成")
    },
    isCancelled,
  )
  return {
    completed,
    failed,
    total: shots.length,
    usage,
    failures,
    cancelled: await isCancelled(),
    segment: await prisma.segment.findUniqueOrThrow({
      where: { id: segment.id },
    }),
  }
}
