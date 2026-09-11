import { z } from "zod"
export const assetGenerationConfigSchema = z.object({
  textModelId: z.string().min(1),
  imageModelId: z.string().min(1),
  sheetAspect: z.literal("16:9"),
  resolution: z.enum(["1K", "2K", "4K"]),
})
export type AssetGenerationConfig = z.infer<typeof assetGenerationConfigSchema>
/** Legacy setup names are accepted; sheet format is independent of the film's aspect. */
export function normalizeAssetConfig(value: unknown): AssetGenerationConfig {
  const v =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  return assetGenerationConfigSchema.parse({
    textModelId: v.textModelId ?? v.textModel ?? "auto",
    imageModelId: v.imageModelId ?? v.imageModel ?? "auto",
    sheetAspect: "16:9",
    resolution: v.resolution ?? "1K",
  })
}
const costumeSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  situation: z.string().optional(),
})
export function costumeDrafts(character: {
  name: string
  description: string
  appearance?: string | null
  costumes?: unknown
}) {
  const parsed = z.array(costumeSchema).safeParse(character.costumes)
  if (parsed.success && parsed.data.length) return parsed.data
  return [
    {
      name: "默认造型",
      description:
        character.appearance?.trim() ||
        `${character.name}：${character.description}；剧本未明确服装细节，保持已有角色设定，不虚构剧情。`,
      situation: "未指定换装情节",
    },
  ]
}
