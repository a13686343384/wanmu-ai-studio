/**
 * 资产图片生成的提示词拼装。
 * 把剧本级的风格设定与资产自身的描述合并成一条可用的 prompt。
 */
export interface AssetPromptContext {
  visualStyle: string | null
  costumeStyle: string | null
  era: string | null
}

export function buildAssetPrompt(
  context: AssetPromptContext,
  kind: "character" | "scene" | "prop",
  name: string,
  description: string,
  extra?: string | null,
): string {
  return [
    context.visualStyle && `视觉风格：${context.visualStyle}`,
    context.costumeStyle && kind === "character" && `服化道：${context.costumeStyle}`,
    context.era && `时代：${context.era}`,
    `${name}：${description}`,
    extra,
  ]
    .filter(Boolean)
    .join("；")
}
