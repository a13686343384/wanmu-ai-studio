import { z } from "zod"

const referenceSchema = z.object({
  name: z.string(),
  kind: z.enum(["image", "video", "audio"]),
})

/** 工作台生成请求。 */
export const generateRequestSchema = z.object({
  workspaceId:z.string().optional(),scriptId:z.string().optional(),projectId:z.string().optional(),writingProjectId:z.string().optional(),
  mediaType: z.enum(["video", "image", "audio", "text"]),
  prompt: z.string().trim().min(1, "请输入提示词").max(2000, "提示词最多 2000 字"),
  modelId: z.string().min(1),
  aspectRatio: z.string().default("16:9"),
  resolution: z.string().default("480p"),
  duration: z.string().default("5s"),
  count: z.number().int().min(1).max(4).default(1),
  style: z.string().nullable().optional(),
  /** 音频模式：智能歌词 / 纯音乐 */
  smartLyrics: z.boolean().optional(),
  references: z.array(referenceSchema).max(12).default([]),
})

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>

/** INTAKE：新建剧本。 */
export const createScriptSchema = z.object({
  title: z.string().trim().min(1, "请输入剧本标题").max(60, "标题最多 60 字"),
  content: z.string().trim().min(20, "剧本内容太短，至少 20 字").max(200000, "剧本内容过长"),
  workType: z.enum(["vertical_short", "horizontal_short", "micro_film", "anime"]),
  seriesType: z.enum(["limited", "serial"]),
  targetAspect: z.enum(["9:16", "16:9", "1:1", "4:3", "3:4"]),
  textModel: z.string().min(1),
  processingMode: z.enum(["consult_optimize", "keep_original"]),
  executionMode: z.enum(["step_by_step", "full_auto"]),
  consultModel: z.string().optional(),
  dialogueModel: z.string().optional(),
  workspaceId: z.string().optional(),
})

export type CreateScriptInput = z.infer<typeof createScriptSchema>

/** 审阅并创建剧本（INTAKE 第二步）。 */
export const reviewScriptSchema = z.object({
  title: z.string().trim().min(1).max(60),
  genre: z.string().trim().max(40).optional(),
  narrativeStyle: z.string().trim().max(60).optional(),
  visualStyle: z.string().trim().max(60).optional(),
  costumeStyle: z.string().trim().max(60).optional(),
  era: z.string().trim().max(40).optional(),
  totalEpisodes: z.number().int().min(1).max(500),
  episodeDuration: z.number().int().min(5).max(3600),
  targetAspect: z.enum(["9:16", "16:9", "1:1", "4:3", "3:4"]),
})

export type ReviewScriptInput = z.infer<typeof reviewScriptSchema>

/** 拆分镜。 */
export const splitStoryboardSchema = z.object({
  mode: z.enum(["text", "image", "video"]).default("text"),
  model: z.string().min(1),
  regenerate: z.boolean().default(false),
})

/** 分镜产物生成。 */
export const generateStoryboardSchema = z.object({
  kind: z.enum(["image", "video"]),
  model: z.string().min(1),
  prompt: z.string().trim().min(1).max(2000),
  negativePrompt: z.string().trim().max(1000).optional(),
  aspectRatio: z.string().optional(),
  resolution: z.string().default("1080p"),
  duration: z.string().optional(),
  skipStoryboardImage: z.boolean().default(false),
})

/** 团队/项目通用：重命名。 */
export const renameSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(60, "名称最多 60 字"),
})
