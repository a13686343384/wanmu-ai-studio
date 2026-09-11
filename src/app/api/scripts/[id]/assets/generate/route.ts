import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getAIService } from "@/services/ai"
import { normalizeAssetConfig } from "@/lib/assets/config"
import { resolveAssetConfig } from "@/services/assets/config"
import { generateScriptAssets } from "@/services/assets/generation"
import { z } from "zod"
const schema = z.object({
  kind: z.preprocess(
    (v) =>
      typeof v === "string"
        ? ((
            {
              characters: "character",
              scenes: "scene",
              props: "prop",
              outfits: "outfit",
            } as Record<string, string>
          )[v] ?? v)
        : v,
    z.enum(["character", "scene", "prop", "outfit"]),
  ),
  ids: z.array(z.string()).optional(),
  model: z.string().optional(),
  resolution: z.enum(["1K", "2K", "4K"]).optional(),
  mode: z.enum(["missing", "all"]).optional(),
  prompt: z.string().trim().max(6000).optional(),
  refImages: z.array(z.string()).max(10).optional(),
  quality: z.string().optional(),
})
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const input = schema.parse(await req.json())
    const previous = normalizeAssetConfig(script.assetGenerationConfig)
    const { config } = await resolveAssetConfig(script.workspaceId, {
      ...previous,
      imageModelId: input.model ?? previous.imageModelId,
      resolution: input.resolution ?? previous.resolution,
    })
    if (!input.ids)
      await prisma.script.update({
        where: { id: script.id },
        data: { assetGenerationConfig: config },
      })
    const result = await generateScriptAssets(
      script,
      { ...input, config, mode: input.mode ?? (input.ids ? "all" : "missing") },
      getAIService(script.workspaceId),
    )
    return jsonOk(result)
  },
)
