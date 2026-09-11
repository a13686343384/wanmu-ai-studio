/**
 * 种子脚本：预置 5 个风格模板包到 StyleTemplate 表。
 * 运行：npx tsx scripts/seed-style-templates.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface TemplatePack {
  name: string
  description: string
  isDefault: boolean
  templates: {
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
}

/* ── 默认万能 ── */
const DEFAULT_PACK: TemplatePack = {
  name: "默认万能",
  description: "适用于所有题材的通用模板，不偏向任何特定风格",
  isDefault: true,
  templates: {
    extractionTemplates: {
      character: `从剧本正文中提取该角色的完整设定，按以下结构输出 JSON：
- name: 角色名
- description: 身份背景（一句话概括社会身份与核心动机）
- appearance: 年龄外貌特征（年龄段、体型、最显著的视觉特征，如疤痕/纹身/异色瞳等）
- personality: 性格（3-5 个关键词 + 一句话行为模式）
- costumes: 造型数组，每项 { name, description(具体服饰外观细节), situation(适用剧情场景) }
  - 没有换装则提供一套默认造型
  - 不要虚构剧本中没有的剧情
只提取剧本有依据的信息，未提及的标注"未设定"。`,
      scene: `从剧本正文中提取该场景的完整设定，按以下结构输出 JSON：
- name: 场景名
- description: 空间概述（位置、大小、功能）
- environment: 空间结构细节（建筑材质、陈设、植被、天气）
- lighting: 光线氛围（光源方向、色温、明暗对比、特殊光效）
只提取剧本有依据的信息。`,
      prop: `从剧本正文中提取该道具的完整设定，按以下结构输出 JSON：
- name: 道具名
- description: 外观与一致性细节（材质、颜色、尺寸、磨损状态、发光/能量指示等）
只提取剧本有依据的信息。`,
      costume: `从剧本正文中提取该造型的完整设定，按以下结构输出 JSON：
- name: 造型名
- description: 具体服饰外观（上衣、下装、鞋靴、配饰、发型、妆容，含颜色与材质）
- situation: 适用剧情场景
只提取剧本有依据的信息。`,
    },
    imagePromptTemplates: {
      character: `A 16:9 character design sheet (industry-standard character reference page), consistent with the declared visual style, deep charcoal background (#141414), thin cool-gray hairline dividers (#333333), clear in-image typography.
{{STYLE_CONTEXT}}
① 顶部标题区：超大号角色名「{{name}}」+ 拼音/英文名，下方身份定位小字。
② 左栏 档案/PROFILE：Height/Age/Role/Traits/Signature Pose，中英对照。未设定的标注「未设定」。
③ 中栏 主视觉/HERO：全身立绘大图，站姿标志化。
④ 中上 表情集/EXPRESSIONS：2×3 共 6 格头像（平静/警觉/专注/严厉/思考/威压）。
⑤ 中下 四视图/FOUR-VIEW TURNAROUND：正面/侧面/背面/3/4侧四联全身图，灰底。
⑥ 右栏 服饰细节/COSTUME DETAILS：2×2 四格特写，每格中英文名称与材质色号。
⑦ 右下 标志道具/SIGNATURE PROPS + 关键特征/KEY FEATURE + 色板/COLOR PALETTE(6色+HEX)。
角色描述：{{description}}
附加要求：{{extra}}
所有分区必须完整出现且排版整齐。`,
      scene: `A 16:9 environment concept sheet (film-production location reference page), consistent with the declared visual style.
{{STYLE_CONTEXT}}
① 顶部标题区：超大号场景双语名称。
② 左侧 主视觉/HERO SHOT（约2/3宽）：场景大图，无人物。
③ 右上 细节/DETAIL MACROS：2×2 四格特写。
④ 右中 色板/PALETTE：6色块+HEX。
⑤ 右下 机位建议/RECOMMENDED FRAMINGS：3格小图。
场景描述：{{description}}
附加要求：{{extra}}`,
      prop: `A 16:9 prop design sheet (game-asset style reference page), studio product-photography lighting on deep charcoal background (#0d0d0f).
{{STYLE_CONTEXT}}
① 顶部标题区：道具双语名称。
② 左上至中部：三视图（侧视/俯视/细节）。
③ 中右：3/4透视主体大图。
④ 右侧 局部放大/DETAIL MACROS：两个方形特写框。
⑤ 底部 色板/COLOR PALETTE：4色块+HEX+中英色名。
道具描述：{{description}}
附加要求：{{extra}}`,
      costume: `A 16:9 costume design sheet, consistent with the declared visual style.
{{STYLE_CONTEXT}}
① 顶部标题区：造型名称 + 所属角色。
② 左侧 全身效果图：正面全身穿着展示。
③ 右上 细节特写：2×2 四格（面料纹理/配饰/鞋靴/发型妆容）。
④ 右下 色板/PALETTE：4-6色块+HEX。
造型描述：{{description}}
附加要求：{{extra}}`,
    },
  },
}

/* ── 赛博废土 ── */
const CYBER_WASTELAND: TemplatePack = {
  name: "赛博废土",
  description: "赛博朋克 + 废土美学，暗色调、数据纹路、锈蚀金属、霓虹残光",
  isDefault: false,
  templates: {
    extractionTemplates: {
      character: `从剧本正文中提取该角色的完整设定（赛博废土世界观），按以下结构输出 JSON：
- name: 角色名
- description: 身份背景（在废土社会中的阶层、势力归属、生存方式）
- appearance: 年龄外貌特征（体型、 cybernetic 改造部位、数据纹路/植入体、瞳孔异变等赛博特征）
- personality: 性格（3-5 个关键词 + 一句话行为模式）
- costumes: 造型数组，每项 { name, description(废土风服饰细节：锈蚀金属扣、战术绑腿、破旧布料、发光管线等), situation(适用剧情) }
重点提取：皮肤下的数据纹路颜色与分布、义体改造部位、武器/工具的外观细节。未提及的标注"未设定"。`,
      scene: `从剧本正文中提取该场景的完整设定（赛博废土世界观），按以下结构输出 JSON：
- name: 场景名
- description: 空间概述（废墟层级、功能区域）
- environment: 空间结构（锈蚀钢结构、裸露管线、破碎全息屏、垃圾堆积、临时棚户）
- lighting: 光线氛围（霓虹残光、应急灯、数据流荧光、烟雾散射、冷暖对比）
重点提取：科技残骸与废土元素的混合程度、光源类型与色彩。`,
      prop: `从剧本正文中提取该道具的完整设定（赛博废土世界观），按以下结构输出 JSON：
- name: 道具名
- description: 外观细节（材质：锈蚀金属/碳纤维/发光晶体；颜色：暗红/漆黑/荧光绿；尺寸；磨损状态；能量指示器/数据接口）
重点提取：科技与废土的融合感、发光部位的颜色与形态。`,
      costume: `从剧本正文中提取该造型的完整设定（赛博废土世界观），按以下结构输出 JSON：
- name: 造型名
- description: 服饰细节（废土夹克/战术背心/破旧布衣 + 金属搭扣/发光管线/数据接口 + 战术靴/绑腿 + 配饰如护目镜/面罩/通讯器，含颜色与材质）
- situation: 适用剧情场景
重点提取：服饰上的科技元素（发光条、数据接口、全息贴片）与废土元素（锈迹、补丁、磨损）的融合。`,
    },
    imagePromptTemplates: {
      character: `A 16:9 character design sheet (industry-standard character reference page), cinematic photorealistic 3D CG, high-tech spec-sheet aesthetic, deep charcoal background (#141414), thin cool-gray hairline dividers (#333333), clear in-image design-document labels.
{{STYLE_CONTEXT}}
① 顶部标题区：超大号角色名「{{name}}」+ 拼音/英文名，下方身份定位小字。
② 左栏 档案/PROFILE：Height/Age/Role/Traits/Signature Pose，中英对照。未设定的标注「未设定」。
③ 中栏 主视觉/HERO：全身立绘，赛博废土风格——皮肤下可见数据纹路微光、义体改造痕迹、废土战术装备。
④ 中上 表情集/EXPRESSIONS：2×3 共 6 格头像（平静/警觉/专注/冷峻/思索/威严）。
⑤ 中下 四视图/FOUR-VIEW TURNAROUND：正面/侧面/背面/3/4侧，灰底，identical character across all views。
⑥ 右栏 服饰细节/COSTUME DETAILS：2×2 四格特写（废土夹克/战术绑腿/金属搭扣/战斗靴），每格 HEX 色号。
⑦ 右下 标志道具/SIGNATURE PROPS（赛博武器特写）+ 关键特征/KEY FEATURE（数据血管/义体特写）+ 色板/COLOR PALETTE(6色+HEX)。
角色描述：{{description}}
Style: Cinematic photorealistic 3D CG, cyberpunk wasteland aesthetic. Subdermal data veins, rusted metal accents, neon residue glow. Realistic adult proportions ~7.5 heads tall.
Avoid: no anime, no chibi, no clean pristine look, no bright saturated colors.
附加要求：{{extra}}`,
      scene: `A 16:9 environment concept sheet, cinematic photorealistic 3D CG, cyberpunk wasteland aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：场景双语名称。
② 左侧 主视觉/HERO SHOT（2/3宽）：废土场景大图——锈蚀钢结构、裸露管线、破碎全息屏、霓虹残光、烟雾散射。无人物。
③ 右上 细节/DETAIL MACROS：2×2（锈蚀金属纹理/发光数据接口/破碎屏幕/地面裂缝）。
④ 右中 色板/PALETTE：6色（#141414/#3E3832/#2F2F2F/#1C1C1C/#D90000/#A0A4A8）。
⑤ 右下 机位建议：低角仰拍/前景遮挡/广角俯瞰。
场景描述：{{description}}
附加要求：{{extra}}`,
      prop: `A 16:9 prop design sheet, studio product-photography, cyberpunk wasteland aesthetic, deep charcoal background (#0d0d0f).
{{STYLE_CONTEXT}}
① 顶部标题区：道具双语名称。
② 三视图（侧视/俯视/细节）——锈蚀金属+发光元件。
③ 3/4透视主体大图——突出材质与体积。
④ 局部放大：磨损部位 + 发光/能量指示部位。
⑤ 色板：4色块+HEX（Matte Black/Dark Red/Gunmetal/Neon Glow）。
道具描述：{{description}}
附加要求：{{extra}}`,
      costume: `A 16:9 costume design sheet, cyberpunk wasteland aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：造型名 + 所属角色。
② 左侧 全身效果图：废土战术装备全身展示——破旧夹克+金属扣+发光管线+战术靴。
③ 右上 细节特写：2×2（面料锈迹/金属搭扣/发光管线/战术靴磨损）。
④ 右下 色板：4-6色+HEX。
造型描述：{{description}}
附加要求：{{extra}}`,
    },
  },
}

/* ── 古风仙侠 ── */
const ANCIENT_XIANXIA: TemplatePack = {
  name: "古风仙侠",
  description: "东方古典美学，水墨意境、飘逸服饰、仙气光影、云雾缭绕",
  isDefault: false,
  templates: {
    extractionTemplates: {
      character: `从剧本正文中提取该角色的完整设定（古风仙侠世界观），按以下结构输出 JSON：
- name: 角色名
- description: 身份背景（门派/境界/师承/在仙界或凡间的地位）
- appearance: 年龄外貌特征（面容气质、发色发型、瞳色、仙气/妖气特征、额饰/印记等）
- personality: 性格（3-5 个关键词 + 一句话行为模式）
- costumes: 造型数组，每项 { name, description(古风服饰细节：交领/广袖/腰封/飘带/云肩/玉佩/剑穗，含颜色与面料), situation(适用剧情) }
重点提取：灵力外显特征（光环/符文/灵气流转）、法宝/佩剑的外观、发饰与头冠细节。未提及的标注"未设定"。`,
      scene: `从剧本正文中提取该场景的完整设定（古风仙侠世界观），按以下结构输出 JSON：
- name: 场景名
- description: 空间概述（仙境/凡间/秘境/洞府）
- environment: 空间结构（亭台楼阁/悬崖瀑布/云海/桃林/竹林/石阶/阵法纹路）
- lighting: 光线氛围（月光/晨光/灵气荧光/烛火/霞光、云雾散射、冷暖意境）
重点提取：仙气浓度（云雾/灵气粒子密度）、建筑风格（飞檐/斗拱/琉璃瓦）、自然元素。`,
      prop: `从剧本正文中提取该道具的完整设定（古风仙侠世界观），按以下结构输出 JSON：
- name: 道具名（法宝/佩剑/丹药/符箓/玉简等）
- description: 外观细节（材质：玉石/玄铁/灵木/丝绸；颜色：青白/朱红/墨黑/金色；尺寸；灵光/符文/剑气等特效）
重点提取：灵力外显效果（光芒颜色与形态）、古朴质感。`,
      costume: `从剧本正文中提取该造型的完整设定（古风仙侠世界观），按以下结构输出 JSON：
- name: 造型名
- description: 服饰细节（交领右衽/广袖/腰封/飘带/云肩/披帛 + 玉佩/剑穗/发冠/步摇 + 绣鞋/云履，含颜色与面料如锦缎/纱罗/冰丝）
- situation: 适用剧情场景
重点提取：服饰的飘逸感（飘带/广袖的动态）、灵力纹路刺绣、配饰的灵光效果。`,
    },
    imagePromptTemplates: {
      character: `A 16:9 character design sheet, Chinese xianxia fantasy aesthetic, ink-wash painting influence with photorealistic 3D CG rendering.
{{STYLE_CONTEXT}}
① 顶部标题区：角色名「{{name}}」+ 拼音，下方身份定位（门派/境界）。
② 左栏 档案/PROFILE：身高/年龄/境界/性格/标志性姿态，中英对照。
③ 中栏 主视觉/HERO：全身立绘，古风仙侠风——飘逸广袖、灵气环绕、发丝飞扬、云雾脚下。
④ 中上 表情集/EXPRESSIONS：2×3 共 6 格（淡然/警惕/专注/冷傲/沉思/威仪）。
⑤ 中下 四视图/TURNAROUND：正面/侧面/背面/3/4侧，宣纸底色。
⑥ 右栏 服饰细节：2×2（交领纹样/腰封玉佩/广袖绣纹/云履），每格色号。
⑦ 右下 法宝/SIGNATURE PROPS（佩剑/法宝特写）+ 灵力特征/KEY FEATURE + 色板(6色+HEX，青白/朱红/墨黑/金色系)。
角色描述：{{description}}
Style: Chinese xianxia, ink-wash meets photorealistic CG. Flowing silk robes, spiritual aura particles, misty atmosphere. Elegant proportions.
Avoid: no western fantasy armor, no anime cel-shading, no modern elements.
附加要求：{{extra}}`,
      scene: `A 16:9 environment concept sheet, Chinese xianxia landscape aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：场景双语名称。
② 左侧 主视觉/HERO SHOT（2/3宽）：仙侠场景——亭台楼阁/悬崖瀑布/云海/桃林，无人物，水墨意境+3D渲染。
③ 右上 细节：2×2（飞檐斗拱/灵石阵法/桃花飘落/云雾纹理）。
④ 右中 色板：6色（青灰/月白/朱砂/墨黑/金箔/翠绿）。
⑤ 右下 机位建议：远景全景/近景特写/俯瞰鸟瞰。
场景描述：{{description}}
附加要求：{{extra}}`,
      prop: `A 16:9 prop design sheet, Chinese xianxia artifact aesthetic, dark silk background.
{{STYLE_CONTEXT}}
① 顶部标题区：法宝/道具双语名称。
② 三视图——玉石/玄铁质感+灵光符文。
③ 3/4透视主体——突出古朴质感与灵力外显。
④ 局部放大：符文细节 + 灵光流转部位。
⑤ 色板：4色（青玉白/玄铁黑/朱砂红/灵光金）。
道具描述：{{description}}
附加要求：{{extra}}`,
      costume: `A 16:9 costume design sheet, Chinese xianxia aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：造型名 + 所属角色。
② 左侧 全身效果图：飘逸古装全身展示——广袖交领+腰封飘带+云肩玉佩。
③ 右上 细节：2×2（绣纹/玉佩/发冠步摇/云履）。
④ 右下 色板：4-6色+HEX。
造型描述：{{description}}
附加要求：{{extra}}`,
    },
  },
}

/* ── 都市现代 ── */
const URBAN_MODERN: TemplatePack = {
  name: "都市现代",
  description: "当代都市写实风，通勤服饰、玻璃幕墙、自然光、生活化场景",
  isDefault: false,
  templates: {
    extractionTemplates: {
      character: `从剧本正文中提取该角色的完整设定（当代都市世界观），按以下结构输出 JSON：
- name: 角色名
- description: 身份背景（职业/公司/社会阶层/家庭关系）
- appearance: 年龄外貌特征（年龄段、体型、发型、妆容风格、显著特征如眼镜/疤痕/胎记）
- personality: 性格（3-5 个关键词 + 一句话行为模式）
- costumes: 造型数组，每项 { name, description(都市服饰细节：西装/衬衫/连衣裙/牛仔裤/运动鞋/高跟鞋/包包/手表，含品牌感与颜色), situation(适用剧情) }
重点提取：职业特征在外貌上的体现（如程序员的格子衫、律师的深色西装）、日常通勤风格。未提及的标注"未设定"。`,
      scene: `从剧本正文中提取该场景的完整设定（当代都市世界观），按以下结构输出 JSON：
- name: 场景名
- description: 空间概述（写字楼/公寓/咖啡厅/医院/学校/街道）
- environment: 空间结构（玻璃幕墙/开放式工位/落地窗/沙发茶几/厨房岛台/地铁站台）
- lighting: 光线氛围（自然日光/办公室荧光灯/咖啡厅暖光/夜景霓虹/路灯）
重点提取：都市生活的真实感细节（品牌logo暗示、装修风格年代感、季节特征）。`,
      prop: `从剧本正文中提取该道具的完整设定（当代都市世界观），按以下结构输出 JSON：
- name: 道具名
- description: 外观细节（材质：塑料/金属/玻璃/皮革/纸张；颜色；尺寸；品牌感；使用痕迹）
重点提取：道具的时代感（智能手机型号暗示、笔记本电脑品牌感）、生活化磨损。`,
      costume: `从剧本正文中提取该造型的完整设定（当代都市世界观），按以下结构输出 JSON：
- name: 造型名
- description: 服饰细节（上衣款式+下装+鞋靴+配饰如手表/耳环/项链/包包+发型妆容，含颜色与面料）
- situation: 适用剧情场景
重点提取：服饰的职业/场合匹配度（商务正装 vs 休闲周末 vs 晚宴礼服）、面料质感。`,
    },
    imagePromptTemplates: {
      character: `A 16:9 character design sheet, contemporary urban realistic style, photorealistic rendering.
{{STYLE_CONTEXT}}
① 顶部标题区：角色名「{{name}}」+ 拼音，下方职业/身份。
② 左栏 档案/PROFILE：身高/年龄/职业/性格/标志姿态，中英对照。
③ 中栏 主视觉/HERO：全身立绘，都市写实风——自然光、生活化姿态、真实面料质感。
④ 中上 表情集/EXPRESSIONS：2×3 共 6 格（微笑/严肃/惊讶/温柔/沉思/坚定）。
⑤ 中下 四视图/TURNAROUND：正面/侧面/背面/3/4侧，浅灰底。
⑥ 右栏 服饰细节：2×2（面料纹理/配饰特写/鞋靴/发型妆容），每格色号。
⑦ 右下 随身物品/SIGNATURE PROPS（手机/笔记本/咖啡杯）+ 关键特征/KEY FEATURE + 色板(6色，自然色系)。
角色描述：{{description}}
Style: Photorealistic, contemporary urban. Natural lighting, real fabric textures, relatable proportions. Clean minimal layout.
Avoid: no fantasy elements, no anime, no overly stylized look.
附加要求：{{extra}}`,
      scene: `A 16:9 environment concept sheet, contemporary urban realistic style.
{{STYLE_CONTEXT}}
① 顶部标题区：场景双语名称。
② 左侧 主视觉/HERO SHOT（2/3宽）：都市场景——写字楼/公寓/咖啡厅/街道，无人物，自然光+室内灯光混合。
③ 右上 细节：2×2（玻璃幕墙反射/桌面物品/窗外城市天际线/地面材质）。
④ 右中 色板：6色（白灰/米色/深蓝/木色/绿植/暖黄灯光）。
⑤ 右下 机位建议：平视/俯拍/窗边逆光。
场景描述：{{description}}
附加要求：{{extra}}`,
      prop: `A 16:9 prop design sheet, contemporary product photography style, clean white/light gray background.
{{STYLE_CONTEXT}}
① 顶部标题区：道具名称。
② 三视图——真实材质质感。
③ 3/4透视主体——生活化使用痕迹。
④ 局部放大：材质纹理 + 品牌/标识细节。
⑤ 色板：4色（自然色系）。
道具描述：{{description}}
附加要求：{{extra}}`,
      costume: `A 16:9 costume design sheet, contemporary urban style.
{{STYLE_CONTEXT}}
① 顶部标题区：造型名 + 所属角色。
② 左侧 全身效果图：都市穿搭全身展示——商务/休闲/晚宴风格。
③ 右上 细节：2×2（面料/配饰/鞋靴/发型妆容）。
④ 右下 色板：4-6色+HEX。
造型描述：{{description}}
附加要求：{{extra}}`,
    },
  },
}

/* ── 末世科幻 ── */
const POST_APOCALYPSE: TemplatePack = {
  name: "末世科幻",
  description: "后启示录风格，破败建筑、防护装备、冷峻色调、辐射尘雾",
  isDefault: false,
  templates: {
    extractionTemplates: {
      character: `从剧本正文中提取该角色的完整设定（末世科幻世界观），按以下结构输出 JSON：
- name: 角色名
- description: 身份背景（幸存者阵营/军事组织/科研团体/流浪者，在末世中的生存方式）
- appearance: 年龄外貌特征（体型、辐射/变异痕迹、伤疤、防护面罩/护目镜下的面容、疲惫感）
- personality: 性格（3-5 个关键词 + 一句话行为模式，末世环境塑造的警惕/冷酷/坚韧）
- costumes: 造型数组，每项 { name, description(末世防护装备细节：防辐射服/战术背心/防毒面具/护甲片/弹药带/生存背包，含磨损与修补痕迹), situation(适用剧情) }
重点提取：防护装备的功能性细节（滤芯/密封条/辐射计数器）、武器的改装痕迹、身体的变异/辐射标记。未提及的标注"未设定"。`,
      scene: `从剧本正文中提取该场景的完整设定（末世科幻世界观），按以下结构输出 JSON：
- name: 场景名
- description: 空间概述（废墟城市/地下避难所/军事基地/荒野营地/实验室遗迹）
- environment: 空间结构（坍塌建筑/锈蚀车辆/临时路障/帐篷/集装箱/破碎玻璃/藤蔓覆盖）
- lighting: 光线氛围（灰暗天光/应急灯/篝火/辐射荧光/探照灯、尘雾散射、压抑色调）
重点提取：文明崩塌的程度（建筑完好度、植被入侵程度）、幸存者的临时改造痕迹。`,
      prop: `从剧本正文中提取该道具的完整设定（末世科幻世界观），按以下结构输出 JSON：
- name: 道具名
- description: 外观细节（材质：锈蚀金属/强化塑料/陶瓷装甲/帆布；颜色：军绿/沙色/铁灰/警示橙；尺寸；磨损/修补/改装痕迹；功能性指示灯/计数器）
重点提取：道具的"拼凑感"（用废料改装的痕迹）、功能性优先的设计语言。`,
      costume: `从剧本正文中提取该造型的完整设定（末世科幻世界观），按以下结构输出 JSON：
- name: 造型名
- description: 服饰细节（防辐射外套/战术裤/ combat boots + 护甲片/弹药带/生存工具腰带 + 防毒面具/护目镜/头巾 + 背包/水袋，含磨损修补痕迹与颜色）
- situation: 适用剧情场景
重点提取：装备的功能性与生存感（每个配件都有用途）、磨损与修补的真实感。`,
    },
    imagePromptTemplates: {
      character: `A 16:9 character design sheet, post-apocalyptic sci-fi aesthetic, photorealistic 3D CG, cold desaturated palette.
{{STYLE_CONTEXT}}
① 顶部标题区：角色名「{{name}}」+ 拼音，下方阵营/身份。
② 左栏 档案/PROFILE：身高/年龄/阵营/性格/标志姿态，中英对照。
③ 中栏 主视觉/HERO：全身立绘，末世风——防护装备、磨损痕迹、疲惫但坚毅的面容、灰暗环境光。
④ 中上 表情集/EXPRESSIONS：2×3 共 6 格（警惕/冷酷/疲惫/坚定/恐惧/愤怒）。
⑤ 中下 四视图/TURNAROUND：正面/侧面/背面/3/4侧，灰绿底色。
⑥ 右栏 装备细节：2×2（防辐射服纹理/护甲片/弹药带/combat boots磨损），每格色号。
⑦ 右下 武器/SIGNATURE PROPS（改装武器特写）+ 变异标记/KEY FEATURE + 色板(6色，军绿/铁灰/沙色/警示橙/锈红/铅灰)。
角色描述：{{description}}
Style: Post-apocalyptic photorealistic CG. Desaturated cold palette, dust haze, worn equipment, survival gear. Gritty texture detail.
Avoid: no clean pristine look, no bright colors, no fantasy elements, no anime.
附加要求：{{extra}}`,
      scene: `A 16:9 environment concept sheet, post-apocalyptic sci-fi aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：场景双语名称。
② 左侧 主视觉/HERO SHOT（2/3宽）：末世场景——废墟城市/地下避难所/荒野营地，无人物，灰暗天光+尘雾。
③ 右上 细节：2×2（坍塌混凝土/锈蚀钢筋/藤蔓入侵/临时路障）。
④ 右中 色板：6色（铅灰/军绿/铁锈/沙色/暗橙/枯黄）。
⑤ 右下 机位建议：低角废墟仰拍/远景荒凉/近景残骸。
场景描述：{{description}}
附加要求：{{extra}}`,
      prop: `A 16:9 prop design sheet, post-apocalyptic military aesthetic, dusty gray background.
{{STYLE_CONTEXT}}
① 顶部标题区：道具双语名称。
② 三视图——锈蚀金属+拼凑改装痕迹。
③ 3/4透视主体——功能性优先的粗犷设计。
④ 局部放大：磨损修补部位 + 功能指示灯/计数器。
⑤ 色板：4色（铁灰/军绿/锈红/警示橙）。
道具描述：{{description}}
附加要求：{{extra}}`,
      costume: `A 16:9 costume design sheet, post-apocalyptic survival aesthetic.
{{STYLE_CONTEXT}}
① 顶部标题区：造型名 + 所属角色。
② 左侧 全身效果图：末世防护装备全身展示——防辐射服+护甲+弹药带+生存背包。
③ 右上 细节：2×2（面料磨损/护甲铆钉/弹药扣/靴底磨痕）。
④ 右下 色板：4-6色+HEX。
造型描述：{{description}}
附加要求：{{extra}}`,
    },
  },
}

const ALL_PACKS = [DEFAULT_PACK, CYBER_WASTELAND, ANCIENT_XIANXIA, URBAN_MODERN, POST_APOCALYPSE]

async function main() {
  for (const pack of ALL_PACKS) {
    await prisma.styleTemplate.upsert({
      where: { name_workspaceId: { name: pack.name, workspaceId: "__global__" } },
      update: { description: pack.description, isDefault: pack.isDefault, templates: pack.templates as object },
      create: { name: pack.name, description: pack.description, isDefault: pack.isDefault, templates: pack.templates as object, workspaceId: "__global__" },
    })
    console.log(`✅ ${pack.name}${pack.isDefault ? " (默认)" : ""}`)
  }
  console.log(`\n共 ${ALL_PACKS.length} 个风格模板包已写入。`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
