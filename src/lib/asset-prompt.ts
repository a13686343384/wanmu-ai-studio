/**
 * 资产图片生成的提示词拼装。
 *
 * 三类资产各有独立的「卡面构图模板」（对齐产品原型 image1/2/3）：
 * - 角色：标题区（名称/拼音/身份行）→ 档案 PROFILE → 主视觉 HERO → 表情集 6 宫格
 *   → 四视图 TURNAROUND → 服饰细节 4 宫格 → 标志道具 → 关键特征 → 色板
 * - 道具：深色展示底 → 三视图（侧视/俯视/细节）→ 主体透视大图 → 局部放大 2 格 → 色板 HEX
 * - 场景：主视觉 HERO（无人物）→ 细节特写 4 宫格 → 色板 6 色 → 机位建议 3 宫格
 * 模板把剧本级风格与资产描述置入固定构图，出图模型按版面输出「设计卡」。
 */
export interface AssetPromptContext {
  visualStyle: string | null
  costumeStyle: string | null
  era: string | null
}

type AssetKind = "character" | "scene" | "prop"

const STYLE_LINE = (context: AssetPromptContext) =>
  [
    context.visualStyle && `视觉风格：${context.visualStyle}`,
    context.costumeStyle && `服化道基调：${context.costumeStyle}`,
    context.era && `时代背景：${context.era}`,
  ]
    .filter(Boolean)
    .join("；")

function characterSheet(
  context: AssetPromptContext,
  name: string,
  description: string,
  extra?: string | null,
): string {
  return [
    `A 16:9 character design sheet (industry-standard character reference page), cinematic photorealistic 3D CG, high-tech spec-sheet aesthetic, deep charcoal background (#141414), thin cool-gray hairline dividers (#333333), clear in-image typography. 整张图为一张「角色设定卡」，版面构图必须严格按以下分区输出：`,
    `① 顶部标题区：超大号角色名「${name}」+ 右侧拼音/英文名，下方一行小字身份定位（${description.slice(0, 60)}）。`,
    `② 左栏 档案 / PROFILE：Height 身高、Age 年龄、Role 角色、Traits 特质、Signature Pose 标志姿势，每项一行中英对照。`,
    `③ 中栏 主视觉 / HERO：全身立绘大图，占画面左侧约 1/3，站姿标志化，${STYLE_LINE(context)}。`,
    `④ 中上 表情集 / EXPRESSIONS：2 行 × 3 列共 6 格头像，标注 平静 Calm / 警觉 Alert / 专注 Focused / 严厉 Stern / 思考 Thinking / 威压 Imposing。`,
    `⑤ 中下 四视图 / FOUR-VIEW TURNAROUND：正面、侧面、背面、3/4 侧四联全身图，灰底。`,
    `⑥ 右栏 服饰细节 / COSTUME DETAILS：2×2 四格特写（外套、护具、腰带金属件、鞋靴），每格下方中英文名称与材质色号。`,
    `⑦ 右下 标志道具 / SIGNATURE PROPS：标志性随身物特写横条；关键特征 / KEY FEATURE：身体特征特写一格；色板 / COLOR PALETTE：6 个色块 + HEX 色号。`,
    extra ? `附加要求：${extra}` : "",
    `所有分区必须完整出现且排版整齐，文字清晰可读，不得遗漏四视图与表情集。`,
  ]
    .filter(Boolean)
    .join("\n")
}

function propSheet(
  context: AssetPromptContext,
  name: string,
  description: string,
  extra?: string | null,
): string {
  return [
    `A 16:9 prop design sheet (game-asset style reference page), studio product-photography lighting on deep charcoal background (#0d0d0f), clean callout lines. 整张图为一张「道具设定卡」，版面构图严格按以下分区输出：`,
    `① 顶部标题区：小徽标 + 道具双语名称「${name} / ${name}」+ 细线延伸装饰。`,
    `② 左上至中部：道具三视图（侧视主视图、顶部俯视图、底部细节视图），等比排列。`,
    `③ 中右：道具 3/4 透视主体大图，突出材质与体积。`,
    `④ 右侧 局部放大 / DETAIL MACROS：两个方形特写框（磨损部位、发光/能量指示部位），细线从大图引出。`,
    `⑤ 底部 色板 / COLOR PALETTE：4 个色块并列，每块上方 HEX 色号、下方中英色名（如 Matte Black 哑光黑）。`,
    `描述与设定：${description}。${STYLE_LINE(context)}。`,
    extra ? `附加要求：${extra}` : "",
    `版面干净、标注清晰，所有分区必须完整出现。`,
  ]
    .filter(Boolean)
    .join("\n")
}

function sceneSheet(
  context: AssetPromptContext,
  name: string,
  description: string,
  extra?: string | null,
): string {
  return [
    `A 16:9 environment concept sheet (film-production location reference page), cinematic photorealistic, cohesive grading. 整张图为一张「场景设定卡」，版面构图严格按以下分区输出：`,
    `① 顶部标题区：超大号场景双语名称「${name} / ${name} EN」，下方一行场景定位小字。`,
    `② 左侧 主视觉 / HERO SHOT（约 2/3 宽）：场景大图，无人物（no characters），${description.slice(0, 80)}。`,
    `③ 右上 细节 / DETAIL MACROS：2×2 四格特写（关键陈设、生存/功能细节、光源发光体、地面材质），每格下方中英文名称。`,
    `④ 右中 色板 / PALETTE：6 个色块横排，每块下方 HEX 色号与中英色名。`,
    `⑤ 右下 机位建议 / RECOMMENDED FRAMINGS：3 格小图（低角仰拍 LOW ANGLE / 前景遮挡 FOREGROUND / 广角俯瞰 WIDE HIGH ANGLE），每格下方标注机位名。`,
    `整体氛围：${STYLE_LINE(context)}。`,
    extra ? `附加要求：${extra}` : "",
    `所有分区必须完整出现，主视觉与细节特写风格统一、光线一致。`,
  ]
    .filter(Boolean)
    .join("\n")
}

export function buildAssetPrompt(
  context: AssetPromptContext,
  kind: AssetKind,
  name: string,
  description: string,
  extra?: string | null,
): string {
  if (kind === "scene") return sceneSheet(context, name, description, extra)
  if (kind === "prop") return propSheet(context, name, description, extra)
  return characterSheet(context, name, description, extra)
}
