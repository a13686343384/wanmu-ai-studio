import { createHash } from "crypto"
import { readFileSync } from "fs"
import path from "path"
import type {
  AIResult,
  AIService,
  AnalyzeScriptInput,
  CharacterDraft,
  ConsultChatInput,
  ConsultChatResult,
  ConsultScriptInput,
  ConsultScriptResult,
  GenerateAudioInput,
  GenerateAudioResult,
  GenerateSubtitleInput,
  GenerateSubtitleResult,
  GenerateImageInput,
  GenerateImageResult,
  GenerateOutlineInput,
  GenerateOutlineResult,
  GenerateTextInput,
  GenerateTextResult,
  GenerateVideoInput,
  GenerateVideoResult,
  OptimizeDialogueInput,
  OptimizeDialogueResult,
  PropDraft,
  SceneDraft,
  ScriptAnalysis,
  SplitStoryboardsInput,
  SplitStoryboardsResult,
  SummarizeEpisodeInput,
  SummarizeEpisodeResult,
  UsageInfo,
} from "./types"
import { prisma } from "@/lib/prisma"
import { costumeDrafts } from "@/lib/assets/config"
import { validateWithText } from "./storyboard-validation"
import { AppError } from "@/lib/api"
import { resolveGenerationModel } from "./live/model-resolver"
import { JSON_ONLY_SUFFIX, extractJson } from "./live/openai-chat"
import { buildGraph, comfyRun, storeOutput } from "./comfy/client"
import type { InvokeInput } from "@/lib/plugins/invoke"
import { invokeCustomModel } from "@/lib/plugins/invoke"
import { loadStyleTemplate, renderTemplate } from "@/lib/style-templates"

/* ---------------------------- 统一模型查找与文本通道 ---------------------------- */

async function chatText(
  selected: { model: string; workspaceId?: string },
  system: string,
  user: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<{ text: string; model: string }> {
  const loaded = await resolveGenerationModel(
    selected.model,
    "text",
    selected.workspaceId,
  )
  const result = await invokeCustomModel(loaded.config, {
    prompt: `${system}\n\n${user}`,
    system,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    upstreamModelId: loaded.providerModel,
  })
  if (!result.ok || !result.text)
    throw new AppError(
      "文本生成失败：" + (result.ok ? "未返回文本" : result.error),
      502,
    )
  return { text: result.text, model: loaded.id }
}

async function chatJson<T>(
  selected: { model: string; workspaceId?: string },
  system: string,
  user: string,
  options?: { maxTokens?: number },
): Promise<{ data: T; model: string }> {
  const { text, model } = await chatText(
    selected,
    `${system}\n${JSON_ONLY_SUFFIX}`,
    user,
    options,
  )
  try {
    return { data: extractJson<T>(text), model }
  } catch {
    const repair = await chatText(
      selected,
      "用户会给你一段不合法的 JSON，请修正为合法 JSON 后只输出修正结果。" +
        JSON_ONLY_SUFFIX,
      text.slice(0, 4000),
      options,
    )
    return { data: extractJson<T>(repair.text), model: repair.model }
  }
}

function validateMediaParameters(
  loaded: Awaited<ReturnType<typeof resolveGenerationModel>>,
  input: {
    aspectRatio?: string
    resolution?: string
    references?: { name: string }[]
    duration?: string
  },
) {
  const c = loaded.config.constraints ?? {}
  for (const [key, value] of [
    ["ratios", input.aspectRatio],
    ["resolutions", input.resolution],
  ] as const) {
    if (
      value &&
      Array.isArray(c[key]) &&
      c[key].length &&
      !c[key].includes(value)
    )
      throw new AppError(`所选模型不支持参数 ${value}`, 400)
  }
  const refs = input.references?.length ?? 0
  if (typeof c.max_references === "number" && refs > c.max_references)
    throw new AppError(`所选模型最多支持 ${c.max_references} 张参考图`, 400)
  if (c.require_reference === true && !refs)
    throw new AppError("所选模型需要首帧或参考图", 400)
  if (input.duration && c.duration && typeof c.duration === "object") {
    const seconds = Number.parseFloat(input.duration)
    const limits = c.duration as { min?: number; max?: number }
    if (
      (limits.min != null && seconds < limits.min) ||
      (limits.max != null && seconds > limits.max)
    )
      throw new AppError("所选时长超出模型支持范围", 400)
  }
}

/* ---------------------------- 计费与工具 ---------------------------- */

function usage(
  inputModel: string,
  usedModel: string,
  tapies: number,
): UsageInfo {
  return { model: usedModel || inputModel, tapies }
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const list = value.filter((item): item is string => typeof item === "string")
  return list.length ? list : fallback
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function appBase(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000"
}

async function fetchRefBytes(
  url: string,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const absolute = url.startsWith("http") ? url : `${appBase()}${url}`
  const res = await fetch(absolute)
  if (!res.ok) throw new Error(`参考素材拉取失败 ${res.status}：${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return {
    bytes: buffer,
    mimeType: res.headers.get("content-type") ?? "image/png",
  }
}

/* ---------------------------- ComfyUI 通道 ---------------------------- */

function loadVideoTemplate(): Record<string, unknown> {
  const file = path.join(
    process.cwd(),
    "src/services/ai/comfy/workflows/minimax-h3-r2v.api.json",
  )
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
}

/** Z-Image Turbo 文生图（对应用户工作流：CFG1 / 9 步 / res_multistep / AuraFlow shift 3）。 */
function zImageT2iGraph(
  prompt: string,
  width: number,
  height: number,
  seed: number,
) {
  return buildGraph(
    {
      "1": {
        class_type: "UNETLoader",
        inputs: {
          unet_name: "Z-Image\\Z-Image_Turbo_FP8_e4m3fn.safetensors",
          weight_dtype: "default",
        },
      },
      "6": {
        class_type: "CLIPLoader",
        inputs: {
          clip_name: "Z-Image\\qwen_3_4b_fp8_mixed.safetensors",
          type: "lumina2",
          device: "default",
        },
      },
      "11": {
        class_type: "VAELoader",
        inputs: { vae_name: "Z-Image\\ae.safetensors" },
      },
      "4": {
        class_type: "ModelSamplingAuraFlow",
        inputs: { shift: 3, model: ["1", 0] },
      },
      "10": {
        class_type: "CLIPTextEncode",
        inputs: { text: prompt, clip: ["6", 0] },
      },
      "25": {
        class_type: "ConditioningZeroOut",
        inputs: { conditioning: ["10", 0] },
      },
      "5": {
        class_type: "EmptySD3LatentImage",
        inputs: { width, height, batch_size: 1 },
      },
      "13": {
        class_type: "KSampler",
        inputs: {
          seed,
          steps: 9,
          cfg: 1,
          sampler_name: "res_multistep",
          scheduler: "simple",
          denoise: 1,
          model: ["4", 0],
          positive: ["10", 0],
          negative: ["25", 0],
          latent_image: ["5", 0],
        },
      },
      "15": {
        class_type: "VAEDecodeTiled",
        inputs: {
          samples: ["13", 0],
          vae: ["11", 0],
          tile_size: 256,
          overlap: 32,
          temporal_size: 8,
          temporal_overlap: 4,
        },
      },
      "16": {
        class_type: "SaveImage",
        inputs: { images: ["15", 0], filename_prefix: "manvo/t2i" },
      },
    },
    {},
  )
}

/** 比例 → 像素（面积 ≈ 0.4MP，对齐 9:16 源工作流的 480x848 档）。 */
function ratioToSize(
  ratio: string,
  quality: string,
): { width: number; height: number } {
  const scale = quality === "4K" ? 2 : quality === "2K" ? 1.5 : 1
  const [w, h] = ratio.split(":").map((n) => Number(n) || 1)
  const megapixels = 0.4 * scale * scale
  const ratioValue = w / h
  const height =
    Math.round(Math.sqrt((megapixels * 1_000_000) / ratioValue) / 16) * 16
  const width = Math.round((height * ratioValue) / 16) * 16
  return { width, height }
}

async function comfyImage(
  input: GenerateImageInput,
  comfyBaseUrl: string,
  workflow?: string,
): Promise<GenerateImageResult> {
  const { width, height } = ratioToSize(input.aspectRatio, input.resolution)
  const count = Math.min(Math.max(input.count ?? 1, 1), 4)
  const images: { url: string }[] = []
  for (let index = 0; index < count; index += 1) {
    const seed = Math.floor(Math.random() * 2 ** 31)
    // 根据 workflow 选择工作流模板，默认 z-image-t2i
    const graph =
      workflow === "z-image-t2i" || !workflow
        ? zImageT2iGraph(input.prompt, width, height, seed)
        : zImageT2iGraph(input.prompt, width, height, seed) // TODO: 支持更多内置工作流或从文件加载
    const outputs = await comfyRun({
      baseUrl: comfyBaseUrl,
      graph,
      timeoutMs: 10 * 60_000,
    })
    const url = await storeOutput(
      input.workspaceId ?? (await defaultWorkspaceId()),
      outputs.find((o) => o.mimeType.startsWith("image/")) ?? outputs[0]!,
      `文生图-${index + 1}`,
    )
    images.push({ url })
  }
  return { images: images.map((image) => ({ url: image.url })) }
}

const H3_REF_NODES = ["18", "19", "38", "45"]
const H3_RATIO_LABEL: Record<string, string> = {
  "9:16": "9:16 (Portrait Widescreen)",
  "16:9": "16:9 (Landscape Widescreen)",
  "1:1": "1:1 (Square)",
  "4:3": "4:3 (Classic)",
  "3:4": "3:4 (Classic Portrait)",
}

async function comfyVideo(
  input: GenerateVideoInput,
  comfyBaseUrl: string,
  workflow?: string,
): Promise<GenerateVideoResult> {
  // 根据 workflow 选择视频模板，默认 minimax-h3-r2v
  const template =
    workflow === "minimax-h3-r2v" || !workflow
      ? loadVideoTemplate()
      : loadVideoTemplate() // TODO: 支持更多内置工作流或从文件加载
  const seconds = Number.parseInt(input.duration.replace(/\D/g, ""), 10) || 5
  const seed = Math.floor(Math.random() * 2 ** 31)

  // 参考图：首帧优先，其次 references；不足四张时复用第一张补齐
  const refUrls = [
    ...(input.firstFrameUrl ? [input.firstFrameUrl] : []),
    ...(input.references
      ?.filter((r) => r.kind === "image")
      .map((r) => r.name) ?? []),
  ]
  const resolved = refUrls.slice(0, 1).length ? refUrls : []
  const padded = resolved.length
    ? Array.from(
        { length: H3_REF_NODES.length },
        (_, i) => resolved[i % resolved.length]!,
      )
    : []
  const refs = await Promise.all(
    padded.map(async (url, index) => {
      const { bytes, mimeType } = await fetchRefBytes(url)
      return { name: `ref-${index}-${hashUrl(url)}.png`, bytes, mimeType }
    }),
  )

  const graph = buildGraph(template, {
    43: { text: input.prompt },
    23: {
      aspect_ratio:
        H3_RATIO_LABEL[input.aspectRatio] ?? "9:16 (Portrait Widescreen)",
    },
    25: { value: seconds },
    4: { seed },
  })

  const outputs = await comfyRun({
    baseUrl: comfyBaseUrl,
    graph,
    refs,
    refImageNodes: refs.length ? H3_REF_NODES : [],
    timeoutMs: 30 * 60_000,
  })
  const video =
    outputs.find((o) => o.mimeType.startsWith("video/")) ?? outputs[0]!
  const poster = outputs.find((o) => o.mimeType.startsWith("image/"))
  const url = await storeOutput(
    input.workspaceId ?? (await defaultWorkspaceId()),
    video,
    "图生视频",
  )
  const posterUrl = poster
    ? await storeOutput(
        input.workspaceId ?? (await defaultWorkspaceId()),
        poster,
        "视频封面",
      )
    : undefined
  return {
    video: {
      url,
      poster: posterUrl,
      duration: seconds,
      mimeType: video.mimeType,
    },
  }
}

function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex").slice(0, 8)
}

async function defaultWorkspaceId(): Promise<string> {
  const workspace = await prisma.workspace.findFirst({ select: { id: true } })
  if (!workspace) throw new Error("没有可用工作区")
  return workspace.id
}

/* ---------------------------- 服务实现 ---------------------------- */

export const liveAIService: AIService = {
  async validateStoryboards(input) {
    return validateWithText(input, (p) => liveAIService.generateText(p))
  },
  async writeScript(input) {
    const { data, model } = await chatJson<{
      blueprint: string
      characters: { name: string; description: string }[]
      episodes: {
        number: number
        title: string
        summary: string
        content: string
      }[]
      reply: string
    }>(
      input,
      "你是资深短剧编剧。基于既有蓝图/正文与用户指令，推进剧本写作。",
      JSON.stringify({
        剧名: input.title,
        题材: input.genre,
        蓝图: input.blueprint,
        已有角色: input.characters,
        已有分集: input.episodes,
        本轮指令: input.instruction ?? "继续写下一集",
        目标集数: input.totalEpisodes,
        单集时长秒: input.episodeDuration,
        输出要求: {
          blueprint: "更新后的完整蓝图（纯文本）",
          characters: "完整角色表（沿用已有角色并按需补充）",
          episodes: "更新后的分集数组，number/title/summary/content",
          reply: "给用户的一句话回复",
        },
      }),
      { maxTokens: 8192 },
    )
    return {
      data: {
        blueprint: asString(data.blueprint, input.blueprint),
        characters: Array.isArray(data.characters)
          ? data.characters
          : input.characters,
        episodes: Array.isArray(data.episodes) ? data.episodes : input.episodes,
        reply: asString(data.reply, "已完成本轮剧本写作。"),
      },
      usage: usage(input.model, model, 8),
    }
  },

  async analyzeScript(
    input: AnalyzeScriptInput,
  ): Promise<AIResult<ScriptAnalysis>> {
    // ── 第一步：分析元信息（不含分集灵感，避免 token 不够导致截断） ──
    const { data: meta, model } = await chatJson<{
      genre: string
      narrativeStyle: string
      visualStyle: string
      costumeStyle: string
      era: string
      tone: string
      audienceNotes: string
      allowed: string[]
      forbidden: string[]
      recommendedEpisodes: number
      recommendedDuration: number
      treatment: string
    }>(
      input,
      "你是短剧立项分析师。通读剧本，输出立项方案（不含分集灵感）。",
      JSON.stringify({
        剧名: input.title,
        作品类型: input.workType,
        画幅: input.targetAspect,
        剧本全文: input.content.slice(0, 24000),
        输出要求: {
          genre: "题材",
          narrativeStyle: "叙事风格",
          visualStyle: "视觉风格",
          costumeStyle: "服化道风格",
          era: "时代背景",
          tone: "整体基调",
          audienceNotes: "观众画像",
          allowed: "允许内容数组",
          forbidden: "禁止内容数组",
          recommendedEpisodes: "推荐集数（数字）",
          recommendedDuration: "推荐单集秒数（数字）",
          treatment: "立项方案摘要（200字以内）",
        },
      }),
      { maxTokens: 4096 },
    )

    const totalEpisodes = asNumber(meta.recommendedEpisodes, 12)

    // ── 第二步：单独生成分集灵感（给足 token） ──
    let episodeIdeas: { number: number; title: string; summary: string }[] = []
    try {
      const { data: ideasData } = await chatJson<{
        episodeIdeas: { number: number; title: string; summary: string }[]
      }>(
        input,
        `你是短剧编剧。根据以下立项方案，为 ${totalEpisodes} 集生成每集的标题和一句话摘要。`,
        JSON.stringify({
          剧名: input.title,
          题材: asString(meta.genre, ""),
          叙事风格: asString(meta.narrativeStyle, ""),
          立项方案: asString(meta.treatment, ""),
          剧本全文: input.content.slice(0, 20000),
          目标集数: totalEpisodes,
          输出要求: {
            episodeIdeas: `恰好 ${totalEpisodes} 个元素的数组，每项 { number(从1开始), title(≤14字), summary(≤80字一句话概括本集核心事件) }`,
          },
        }),
        { maxTokens: Math.max(8192, totalEpisodes * 200) },
      )
      episodeIdeas = Array.isArray(ideasData.episodeIdeas)
        ? ideasData.episodeIdeas.map((item, index) => ({
            number: asNumber(item?.number, index + 1),
            title: asString(item?.title, `第${index + 1}集`),
            summary: asString(item?.summary, ""),
          }))
        : []
    } catch {
      // 分集灵感生成失败不阻塞主流程
      console.warn("[analyzeScript] 分集灵感生成失败，使用空数组")
    }

    const analysis: ScriptAnalysis = {
      genre: asString(meta.genre, "都市/情感/悬疑"),
      narrativeStyle: asString(meta.narrativeStyle, "多线交织、情绪递进"),
      visualStyle: asString(meta.visualStyle, "高质感实拍"),
      costumeStyle: asString(meta.costumeStyle, "都市通勤风"),
      era: asString(meta.era, "当代都市"),
      tone: asString(meta.tone, "细腻、克制、有温度"),
      audienceNotes: asString(
        meta.audienceNotes,
        "目标观众偏好强钩子、快节奏。",
      ),
      allowed: asStringArray(meta.allowed, ["强冲突与反转", "情感张力"]),
      forbidden: asStringArray(meta.forbidden, [
        "过度血腥特写",
        "现实政治影射",
        "未成年人不当情节",
      ]),
      recommendedEpisodes: totalEpisodes,
      recommendedDuration: asNumber(meta.recommendedDuration, 90),
      treatment: asString(meta.treatment, "立项方案生成中内容缺失。"),
      episodeIdeas,
    }
    return { data: analysis, usage: usage(input.model, model, 8) }
  },

  async generateText(
    input: GenerateTextInput,
  ): Promise<AIResult<GenerateTextResult>> {
    const { text, model } = await chatText(
      input,
      "你是专业影视创作助手，用中文回答，输出直接可用的创作内容。",
      input.prompt,
    )
    return { data: { text }, usage: usage(input.model, model, 2) }
  },

  async consultScript(
    input: ConsultScriptInput,
  ): Promise<AIResult<ConsultScriptResult>> {
    const { data, model } = await chatJson<{
      summary: string
      suggestions: {
        category: string
        severity: string
        issue: string
        suggestion: string
        mustFix: boolean
      }[]
    }>(
      input,
      "你是短剧剧本会诊医生。按 结构/人物/节奏/台词/逻辑 五类诊断，按优先级给出 5 条左右建议。",
      JSON.stringify({
        剧名: input.scriptTitle,
        剧本全文: input.content.slice(0, 24000),
        输出要求: {
          summary: "整体诊断摘要",
          suggestions:
            "数组，每项 category/severity(high|medium|low)/issue/suggestion/mustFix(布尔)",
        },
      }),
      { maxTokens: 8192 },
    )
    const suggestions = (
      Array.isArray(data.suggestions) ? data.suggestions : []
    ).map((item, index) => ({
      id: `c-${index + 1}`,
      category: asString(item?.category, "结构"),
      severity: (["high", "medium", "low"] as const).includes(
        item?.severity as "high",
      )
        ? (item!.severity as "high" | "medium" | "low")
        : "medium",
      issue: asString(item?.issue, ""),
      suggestion: asString(item?.suggestion, ""),
      mustFix: Boolean(item?.mustFix),
    }))
    return {
      data: {
        summary: asString(data.summary, "会诊完成。"),
        suggestions: suggestions.length
          ? suggestions
          : [
              {
                id: "c-1",
                category: "结构",
                severity: "medium" as const,
                issue: "本次会诊未产出结构化建议，请重试。",
                suggestion: "重试会诊。",
                mustFix: false,
              },
            ],
      },
      usage: usage(input.model, model, 6),
    }
  },

  async consultChat(
    input: ConsultChatInput,
  ): Promise<AIResult<ConsultChatResult>> {
    const { data, model } = await chatJson<{ reply: string }>(
      input,
      "你是短剧剧本医生，围绕既有诊断项回应用户的修改想法，给出可落地的改法。",
      JSON.stringify({
        剧名: input.scriptTitle,
        诊断项: input.suggestion,
        用户想法: input.message,
        输出要求: { reply: "给用户的回应与改法要点（纯文本）" },
      }),
    )
    return {
      data: { reply: asString(data.reply, "收到。") },
      usage: usage(input.model, model, 2),
    }
  },

  async optimizeDialogue(
    input: OptimizeDialogueInput,
  ): Promise<AIResult<OptimizeDialogueResult>> {
    const { data, model } = await chatJson<{
      optimized: string
      changes: string[]
    }>(
      input,
      "你是台词医生。优化剧本台词：删解释性长句、改动作短句、统一称呼，保留信息量。",
      JSON.stringify({
        剧本内容: input.content.slice(0, 16000),
        输出要求: { optimized: "优化后全文", changes: "改动点数组" },
      }),
      { maxTokens: 8192 },
    )
    return {
      data: {
        optimized: asString(data.optimized, input.content),
        changes: asStringArray(data.changes, ["优化台词节奏"]),
      },
      usage: usage(input.model, model, 4),
    }
  },

  async generateOutline(
    input: GenerateOutlineInput,
  ): Promise<AIResult<GenerateOutlineResult>> {
    const { data, model } = await chatJson<{
      episodes: {
        number: number
        title: string
        summary: string
        content: string
      }[]
    }>(
      input,
      "你是短剧大纲师。按指定集数输出分集大纲与每集完整正文。",
      JSON.stringify({
        剧名: input.scriptTitle,
        剧本素材: input.content.slice(0, 20000),
        目标集数: input.totalEpisodes,
        单集时长秒: input.episodeDuration,
        输出要求: {
          episodes: `恰好 ${input.totalEpisodes} 个元素的数组，number 从 1 开始，title≤14字，summary≤100字，content 为本集完整剧本正文`,
        },
      }),
      { maxTokens: 8192 },
    )
    const episodes = (Array.isArray(data.episodes) ? data.episodes : []).map(
      (item, index) => ({
        number: asNumber(item?.number, index + 1),
        title: asString(item?.title, `第${index + 1}集`),
        summary: asString(item?.summary, ""),
        content: asString(item?.content, ""),
        duration: input.episodeDuration,
      }),
    )
    return { data: { episodes }, usage: usage(input.model, model, 8) }
  },

  async summarizeEpisode(
    input: SummarizeEpisodeInput,
  ): Promise<AIResult<SummarizeEpisodeResult>> {
    const { data, model } = await chatJson<{ recap: string; beats: string[] }>(
      input,
      "你是短剧导演。复述本集核心，并给出镜组（beats）建议。",
      JSON.stringify({
        集名: input.episodeTitle,
        本集正文: input.content.slice(0, 16000),
        输出要求: { recap: "AI 复述理解（纯文本）", beats: "镜组建议数组" },
      }),
    )
    return {
      data: {
        recap: asString(data.recap, "本集复述生成失败，请重试。"),
        beats: asStringArray(data.beats, []),
      },
      usage: usage(input.model, model, 3),
    }
  },

  async extractCharacters(input): Promise<AIResult<CharacterDraft[]>> {
    // 加载风格模板的提取模板
    const styleTemplate = await loadStyleTemplate(input.costumeStyle ?? null)
    const extractionTpl = styleTemplate.extractionTemplates.character
    const systemPrompt = extractionTpl
      ? `你是选角导演。严格按照以下模板格式从剧本正文中提取角色信息，输出 JSON。\n\n${extractionTpl}`
      : "你是选角导演。从剧本正文提取全部有名有姓的角色。"
    const userPrompt = extractionTpl
      ? JSON.stringify({ 剧本正文: input.content.slice(0, 20000) })
      : JSON.stringify({
          剧本正文: input.content.slice(0, 20000),
          输出要求: {
            characters:
              "数组，每项 name/description(身份背景与性格)/appearance(外貌服化细节)/personality/costumes。costumes为按剧本换装提取的造型数组，每项name/description(具体服饰外观)/situation(适用剧情)；没有换装则根据已知外观提供默认造型，不要虚构剧情。",
          },
        })
    const { data, model } = await chatJson<{ characters: CharacterDraft[] }>(
      input,
      systemPrompt,
      userPrompt,
      { maxTokens: 8192 },
    )
    const characters = Array.isArray(data.characters) ? data.characters : []
    return {
      data: characters.map((item) => ({
        name: asString(item?.name, "未命名角色"),
        description: asString(item?.description, ""),
        appearance: asString(item?.appearance, ""),
        personality: asString(item?.personality, ""),
        costumes: costumeDrafts(item),
      })),
      usage: usage(input.model, model, 5),
    }
  },

  async extractScenes(input): Promise<AIResult<SceneDraft[]>> {
    const styleTemplate = await loadStyleTemplate(input.costumeStyle ?? null)
    const extractionTpl = styleTemplate.extractionTemplates.scene
    const systemPrompt = extractionTpl
      ? `你是美术指导。严格按照以下模板格式从剧本正文中提取场景信息，输出 JSON。\n\n${extractionTpl}`
      : "你是美术指导。从剧本正文提取全部场景。"
    const userPrompt = extractionTpl
      ? JSON.stringify({ 剧本正文: input.content.slice(0, 20000) })
      : JSON.stringify({
          剧本正文: input.content.slice(0, 20000),
          输出要求: { scenes: "数组，每项 name/description/environment(空间结构)/lighting(光线氛围)" },
        })
    const { data, model } = await chatJson<{ scenes: SceneDraft[] }>(
      input,
      systemPrompt,
      userPrompt,
      { maxTokens: 8192 },
    )
    const scenes = Array.isArray(data.scenes) ? data.scenes : []
    return {
      data: scenes.map((item) => ({
        name: asString(item?.name, "未命名场景"),
        description: asString(item?.description, ""),
        environment: asString(item?.environment, ""),
        lighting: asString(item?.lighting, ""),
      })),
      usage: usage(input.model, model, 5),
    }
  },

  async extractProps(input): Promise<AIResult<PropDraft[]>> {
    const styleTemplate = await loadStyleTemplate(input.costumeStyle ?? null)
    const extractionTpl = styleTemplate.extractionTemplates.prop
    const systemPrompt = extractionTpl
      ? `你是道具师。严格按照以下模板格式从剧本正文中提取道具信息，输出 JSON。\n\n${extractionTpl}`
      : "你是道具师。从剧本正文提取全部关键道具。"
    const userPrompt = extractionTpl
      ? JSON.stringify({ 剧本正文: input.content.slice(0, 20000) })
      : JSON.stringify({
          剧本正文: input.content.slice(0, 20000),
          输出要求: { props: "数组，每项 name/description(外观与一致性细节)" },
        })
    const { data, model } = await chatJson<{ props: PropDraft[] }>(
      input,
      systemPrompt,
      userPrompt,
    )
    const props = Array.isArray(data.props) ? data.props : []
    return {
      data: props.map((item) => ({
        name: asString(item?.name, "未命名道具"),
        description: asString(item?.description, ""),
      })),
      usage: usage(input.model, model, 4),
    }
  },

  async splitStoryboards(
    input: SplitStoryboardsInput,
  ): Promise<AIResult<SplitStoryboardsResult>> {
    const { data, model } = await chatJson<{
      storyboards: {
        number: number
        shotType: string
        description: string
        dialogue?: string
        action?: string
        camera?: string
        duration: number
        segmentTitle?: string
        segmentNote?: string
      }[]
    }>(
      input,
      "你是短剧分镜师。按镜组把本集内容切成 8-12 个分镜。",
      JSON.stringify({
        集名: input.episodeTitle,
        本集正文: input.content.slice(0, 16000),
        输出要求: {
          storyboards:
            "数组，每项 number(从1递增)/shotType(远景|全景|中景|近景|特写)/description(画面描述)/dialogue(台词，可空)/action(动作)/camera(运镜)/duration(秒数)/segmentTitle(所属镜组标题，格式如 B01·闪回·有剧情镜，每 5-7 镜一组，组名体现情节拍)/segmentNote(本组衔接与出图建议，可空)",
        },
      }),
      { maxTokens: 8192 },
    )
    const shotTypes = ["远景", "全景", "中景", "近景", "特写"]
    const storyboards = (
      Array.isArray(data.storyboards) ? data.storyboards : []
    ).map((item, index) => ({
      number: asNumber(item?.number, index + 1),
      shotType: shotTypes.includes(item?.shotType as "中景")
        ? item!.shotType
        : "中景",
      description: asString(item?.description, ""),
      dialogue: item?.dialogue ? String(item.dialogue) : undefined,
      action: item?.action ? String(item.action) : undefined,
      camera: item?.camera ? String(item.camera) : undefined,
      duration: asNumber(item?.duration, 3),
      segmentTitle: item?.segmentTitle ? String(item.segmentTitle) : undefined,
      segmentNote: item?.segmentNote ? String(item.segmentNote) : undefined,
    }))
    return {
      data: {
        storyboards: storyboards.length
          ? storyboards
          : [
              {
                number: 1,
                shotType: "中景",
                description: "分镜拆分结果为空，请重试。",
                duration: 3,
              },
            ],
      },
      usage: usage(input.model, model, 6),
    }
  },

  /* ---------------------------- 图像 / 视频 / 音频 ---------------------------- */

  async generateImage(
    input: GenerateImageInput,
  ): Promise<AIResult<GenerateImageResult>> {
    const loaded = await resolveGenerationModel(
      input.model,
      "image",
      input.workspaceId,
    )
    validateMediaParameters(loaded, input)
    if (loaded.providerType === "comfyui") {
      const workflow = String(
        (loaded.config.constraints ?? {}).workflow ?? "z-image-t2i",
      )
      const result = await comfyImage(input, loaded.config.baseUrl, workflow)
      return { data: result, usage: usage(loaded.id, "", loaded.cost) }
    }
    const invokeInput: InvokeInput = {
      prompt: input.prompt,
      ratio: input.aspectRatio,
      resolution: input.resolution,
      count: input.count ?? 1,
      quality: input.quality,
      refs: input.references?.map((r) => r.name),
    }
    const result = await invokeCustomModel(loaded.config, invokeInput)
    if (!result.ok || !result.url) {
      throw new Error(
        "图片生成失败：" + (result.ok ? "未返回结果" : result.error),
      )
    }
    return {
      data: { images: [{ url: result.url }] },
      usage: usage(loaded.id, "", loaded.cost),
    }
  },

  async generateVideo(
    input: GenerateVideoInput,
  ): Promise<AIResult<GenerateVideoResult>> {
    input = {
      ...input,
      references: Array.from(
        new Set([
          ...(input.firstFrameUrl ? [input.firstFrameUrl] : []),
          ...(input.references
            ?.filter((r) => r.kind === "image")
            .map((r) => r.name) ?? []),
        ]),
      ).map((name) => ({ name, kind: "image" as const })),
    }
    const loaded = await resolveGenerationModel(
      input.model,
      "video",
      input.workspaceId,
    )
    validateMediaParameters(loaded, input)
    if (loaded.providerType === "comfyui") {
      const workflow = String(
        (loaded.config.constraints ?? {}).workflow ?? "minimax-h3-r2v",
      )
      const result = await comfyVideo(input, loaded.config.baseUrl, workflow)
      return { data: result, usage: usage(loaded.id, "", loaded.cost) }
    }
    const invokeInput: InvokeInput = {
      prompt: input.prompt,
      ratio: input.aspectRatio,
      resolution: input.resolution,
      duration: Number.parseInt(input.duration.replace(/\D/g, ""), 10) || 5,
      refs: input.references?.map((r) => r.name),
    }
    const result = await invokeCustomModel(loaded.config, invokeInput)
    if (!result.ok || !result.url) {
      throw new Error(
        "视频生成失败：" + (result.ok ? "未返回结果" : result.error),
      )
    }
    return {
      data: {
        video: {
          url: result.url,
          duration: invokeInput.duration ?? 5,
          mimeType: "video/mp4",
        },
      },
      usage: usage(loaded.id, "", loaded.cost),
    }
  },

  async generateAudio(
    input: GenerateAudioInput,
  ): Promise<AIResult<GenerateAudioResult>> {
    const loaded = await resolveGenerationModel(
      input.model,
      "audio",
      input.workspaceId,
    )
    const invokeInput: InvokeInput = {
      prompt: input.prompt,
      duration: Number.parseInt(input.duration.replace(/\D/g, ""), 10) || 15,
    }
    const result = await invokeCustomModel(loaded.config, invokeInput)
    if (!result.ok || !result.url) {
      throw new Error(
        "音频生成失败：" + (result.ok ? "未返回结果" : result.error),
      )
    }
    return {
      data: {
        audio: { url: result.url, duration: 15, mimeType: "audio/mpeg" },
      },
      usage: usage(loaded.id, "", loaded.cost),
    }
  },

  async generateSubtitle(
    input: GenerateSubtitleInput,
  ): Promise<AIResult<GenerateSubtitleResult>> {
    const loaded = await resolveGenerationModel(
      input.model,
      "subtitle",
      input.workspaceId,
    )
    // ASR 调用：上传音频 URL，返回文本结果
    const invokeInput: InvokeInput = {
      prompt: input.audioUrl,
    }
    const result = await invokeCustomModel(loaded.config, invokeInput)
    if (!result.ok) {
      throw new Error("字幕生成失败：" + result.error)
    }
    // 尝试从 text 解析 JSON segments，否则当作纯文本
    let segments: { start: number; end: number; text: string }[] = []
    let srt = result.text ?? ""
    try {
      const parsed = JSON.parse(srt)
      if (Array.isArray(parsed)) {
        segments = parsed
        srt = segments
          .map((s, i) => {
            const fmt = (t: number) => {
              const m = Math.floor(t / 60)
              const sec = Math.floor(t % 60)
              const ms = Math.round((t % 1) * 1000)
              return `00:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`
            }
            return `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}`
          })
          .join("\n\n")
      }
    } catch {
      // 纯文本，包装为单段
      segments = [{ start: 0, end: 0, text: srt }]
    }
    return {
      data: { srt, segments },
      usage: usage(loaded.id, "", loaded.cost),
    }
  },
}
