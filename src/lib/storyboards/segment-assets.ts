import { z } from "zod"
export const segmentAssetConfigSchema = z.object({
  textModelId: z.string().min(1),
  imageModelId: z.string().min(1),
  aspectRatio: z.enum(["1:1","2:1","1:2","5:4","4:5","4:3","3:4","3:2","2:3","16:9","9:16","21:9"]),
  resolution: z.enum(["1K", "2K", "4K"]),
  qualityTier: z.enum(["低画质","标准画质","高画质"]).default("低画质"),
  sequential: z.boolean(),
  safeRewrite: z.boolean(),
})
export type SegmentAssetConfig = z.infer<typeof segmentAssetConfigSchema>
export const segmentAssetActionSchema = z.enum([
  "fill",
  "regenerate",
  "firstFrame",
  "blockingPlan",
  "crowdPlan",
])
export type SegmentAssetAction = z.infer<typeof segmentAssetActionSchema>
