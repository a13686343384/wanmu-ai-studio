import { prisma } from "@/lib/prisma"

export interface StyleTemplateData {
  extractionTemplates: {
    character: string
    scene: string
    prop: string
    costume: string
  }
  imagePromptTemplates: {
    character: string
    scene: string
    prop: string
    costume: string
  }
}

/**
 * 加载指定风格的模板包。
 * 优先按 styleName 精确匹配，找不到则回退到默认万能模板。
 */
export async function loadStyleTemplate(styleName?: string | null): Promise<StyleTemplateData> {
  // 1. 按名称查找
  if (styleName) {
    const found = await prisma.styleTemplate.findFirst({
      where: { name: styleName },
      select: { templates: true },
    })
    if (found) return found.templates as unknown as StyleTemplateData
  }

  // 2. 回退到默认模板
  const defaultTpl = await prisma.styleTemplate.findFirst({
    where: { isDefault: true },
    select: { templates: true },
  })
  if (defaultTpl) return defaultTpl.templates as unknown as StyleTemplateData

  // 3. 兜底：返回空模板（调用方应使用内置默认）
  return {
    extractionTemplates: { character: "", scene: "", prop: "", costume: "" },
    imagePromptTemplates: { character: "", scene: "", prop: "", costume: "" },
  }
}

/**
 * 渲染模板中的占位符。
 * 支持 {{name}} {{description}} {{extra}} {{STYLE_CONTEXT}} 等。
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return result
}
