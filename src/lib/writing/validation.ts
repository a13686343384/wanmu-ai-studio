import { z } from "zod"
import { TEXT_MODELS, WRITING_GENRES } from "@/lib/constants"
export const createWritingSchema = z.object({
  title: z.string().trim().min(1, "请输入剧名").max(60),
  genre: z
    .string()
    .refine((value) => WRITING_GENRES.includes(value), "请选择题材"),
  idea: z.string().trim().min(5, "请用至少 5 个字描述故事核心").max(5000),
  totalEpisodes: z.number().int().min(1).max(100),
  episodeDuration: z.number().int().min(15).max(600),
  workspaceId: z.string().optional(),
})
export const writingActionSchema = z.object({
  action: z.enum(["blueprint", "episode", "chat", "save", "restore", "import"]),
  revision: z.number().int().nonnegative(),
  model: z
    .string()
    .default(TEXT_MODELS[0]!.id)
    .refine(
      (value) => TEXT_MODELS.some((model) => model.id === value),
      "请选择可用文本模型",
    ),
  episodeNumber: z.number().int().min(1).max(100).optional(),
  content: z.string().max(100000).optional(),
  instruction: z.string().trim().min(1).max(2000).optional(),
  historyId: z.string().optional(),
})
