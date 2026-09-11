import { jsonOk, withErrorHandling } from "@/lib/api"
import { requireScriptAccess, requireUser } from "@/lib/session"
import { getAIService } from "@/services/ai"
import { resolveAssetConfig } from "@/services/assets/config"
import { extractScriptAssets } from "@/services/assets/extraction"
import { normalizeAssetConfig } from "@/lib/assets/config"
import { z } from "zod"
const schema = z.object({
  model: z.string().optional(),
  textModel: z.string().optional(),
  textModelId: z.string().optional(),
  imageModel: z.string().optional(),
  imageModelId: z.string().optional(),
  resolution: z.enum(["1K", "2K", "4K"]).optional(),
  kinds: z.array(z.enum(["characters", "scenes", "props"])).optional(),
  merge: z.boolean().optional(),
  keyword: z.string().trim().max(200).optional(),
})
export const POST = withErrorHandling(
  async (req: Request, { params }: { params: { id: string } }) => {
    const user = await requireUser()
    const script = await requireScriptAccess(params.id, user.id)
    const input = schema.parse(await req.json().catch(() => ({})))
    const previous = normalizeAssetConfig(script.assetGenerationConfig)
    const { config, imageModelName } = await resolveAssetConfig(
      script.workspaceId,
      {
        ...previous,
        textModelId:
          input.textModelId ??
          input.textModel ??
          input.model ??
          previous.textModelId,
        imageModelId:
          input.imageModelId ?? input.imageModel ?? previous.imageModelId,
        resolution: input.resolution ?? previous.resolution,
      },
    )
    return jsonOk(
      await extractScriptAssets(
        script,
        { config, imageModelName, ...input },
        getAIService(script.workspaceId),
      ),
    )
  },
)
