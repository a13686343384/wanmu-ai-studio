/**
 * 按 Word 文档「仔仔神魔人物场景道具神兽提示词通用模版」更新默认万能模板的提取模板。
 * 运行：npx tsx scripts/update-extraction-templates.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const CHARACTER_EXTRACTION = `为每个独立角色输出如下 JSON 结构（数组）：
每项包含：
- name: 角色名称（如无名称则用"角色一""角色二"）
- gender: 性别（男/女）
- age: 年龄（少年/青年/中年/老年 或具体岁数）
- description: 身份背景与核心动机（一句话概括社会身份、势力归属、生存方式）
- appearance: 外貌细节，必须包含以下子项：
  · 头部：发型（束发/披散/发髻等）、发色、发饰（冠/簪/步摇等）、面容特征（眉形、眼形、肤色、神印纹路）、瞳孔颜色、表情基调
  · 上身：服装款式（交领/圆领/战甲等）、颜色、材质、纹路图案、袖型、领口细节、肩部造型、手臂装饰
  · 腰部：腰带材质、颜色、宽度、扣饰、悬挂物
  · 下身：裙摆或裤装描述：长度、层数、颜色、纹路、拖地情况
  · 脚：鞋靴或赤足：材质、颜色、高度、鞋型
- personality: 性格（3-5个关键词 + 一句话行为模式）
- costumes: 造型数组，每项 { name, description(具体服饰外观，按上述头部/上身/腰部/下身/脚的结构描述), situation(适用剧情) }
  没有换装则根据已知外观提供默认造型，不要虚构剧情。

只提取剧本有依据的信息，未提及的标注"未设定"。不要虚构剧本中没有的剧情。`

const SCENE_EXTRACTION = `为每个独立场景输出如下 JSON 结构（数组）：
每项包含：
- name: 场景名称（如"诛仙台""天劫战场"）
- description: 空间概述（位置、大小、功能）
- environment: 静态环境描述，必须细致描写：
  · 地形/建筑：材质、颜色、尺寸
  · 天空/背景：天气、云层、星空等
  · 地面：材质、纹理、残留物
  · 静态残留物：血迹/碎片/裂纹等
  · 悬浮物（无动态）
  · 光影：光源方向、色温、明暗对比（无动态光源变化）
  禁止任何人物、生物、动态特效。描述需丰富细节，突出空间感与氛围。
- lighting: 光线氛围总结（光源方向、色温、整体明暗基调）

只提取剧本有依据的信息。`

const PROP_EXTRACTION = `为每个道具输出如下 JSON 结构（数组）：
每项包含：
- name: 物品名称（如"太初剑""丹炉碎片""内门弟子令牌"）
- description: 静态外观，必须包含：
  · 材质、颜色、尺寸（长宽高或直径）
  · 造型：整体形状及关键结构特征
  · 表面细节：纹路（刻字/浮雕/云纹等）、焦痕/灼烧痕迹、裂纹（位置/走向）、缺口（位置/形状）、附着物（药渣/炉液/灰尘/锈迹等）、磨损痕迹
  · 完整状态：完好/轻微磨损/明显破损/碎裂/单块碎片
  若原文信息不足，可根据剧情、角色身份、场景氛围进行合理推测，并标注"（推测）"。
  禁止任何动态特效（火焰、烟雾、光效、飘动等）。

只提取剧本有依据的道具。`

const COSTUME_EXTRACTION = `为每个造型输出如下 JSON 结构（数组）：
每项包含：
- name: 造型名称
- description: 具体服饰外观，必须按以下结构描述：
  · 头部：发型、发色、发饰、面容特征
  · 上身：服装款式、颜色、材质、纹路、袖型、领口、肩部、手臂装饰
  · 腰部：腰带材质、颜色、扣饰、悬挂物
  · 下身：裙摆或裤装：长度、层数、颜色、纹路
  · 脚：鞋靴材质、颜色、高度、鞋型
- situation: 适用剧情场景

只提取剧本有依据的造型信息。`

async function main() {
  const tpl = await prisma.styleTemplate.findFirst({ where: { isDefault: true } })
  if (!tpl) { console.error("未找到默认模板"); return }

  const templates = tpl.templates as any
  templates.extractionTemplates = {
    character: CHARACTER_EXTRACTION,
    scene: SCENE_EXTRACTION,
    prop: PROP_EXTRACTION,
    costume: COSTUME_EXTRACTION,
  }

  await prisma.styleTemplate.update({
    where: { id: tpl.id },
    data: { templates },
  })

  console.log(`✅ 已更新默认模板 "${tpl.name}" 的提取模板`)
  console.log(`  角色模板: ${CHARACTER_EXTRACTION.length} 字`)
  console.log(`  场景模板: ${SCENE_EXTRACTION.length} 字`)
  console.log(`  道具模板: ${PROP_EXTRACTION.length} 字`)
  console.log(`  妆造模板: ${COSTUME_EXTRACTION.length} 字`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
