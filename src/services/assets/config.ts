import { normalizeAssetConfig } from "@/lib/assets/config"
import { getAiMode } from "@/lib/settings"
import { resolveGenerationModel } from "@/services/ai/live/model-resolver"
import { TEXT_MODELS, IMAGE_MODELS } from "@/lib/constants"
import { AppError } from "@/lib/api"
export async function resolveAssetConfig(workspaceId: string, value: unknown) {
  const config = normalizeAssetConfig(value)
  if ((await getAiMode()) === "live") {
    const text = await resolveGenerationModel(
      config.textModelId,
      "text",
      workspaceId,
    )
    const image = await resolveGenerationModel(
      config.imageModelId,
      "image",
      workspaceId,
    )
    return {
      config: { ...config, textModelId: text.id, imageModelId: image.id },
      imageModelName: image.name,
    }
  }
  const text =
    config.textModelId === "auto"
      ? TEXT_MODELS[0]
      : TEXT_MODELS.find((m) => m.id === config.textModelId)
  const image =
    config.imageModelId === "auto"
      ? IMAGE_MODELS[0]
      : IMAGE_MODELS.find((m) => m.id === config.imageModelId)
  if (!text || !image)
    throw new AppError("所选资产模型在当前模式不可用，请重新选择", 400)
  return {
    config: { ...config, textModelId: text.id, imageModelId: image.id },
    imageModelName: image.name,
  }
}
