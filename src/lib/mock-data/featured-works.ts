/**
 * 工作台精选作品（Mock）。
 * 与产品需求稿一致：9 件作品，含类型标签、标题、描述。
 * 缩略图用程序化 SVG 占位（无外部位图依赖），保证离线可看。
 */

export interface FeaturedWork {
  id: string
  /** 序号，展示为 01 / 09 */
  index: number
  /** 类型标签：电影短片 / 商业广告 / 奇幻动画 … */
  category: string
  title: string
  description: string
  /** 用于生成占位封面的种子 */
  seed: string
  aspectRatio: string
  duration: string
}

export const FEATURED_WORKS: readonly FeaturedWork[] = [
  {
    id: "w-01",
    index: 1,
    category: "电影短片",
    title: "末日迟到了十二年",
    description: "历史巨兽与未知文明交汇的影视灾难短片。",
    seed: "巨兽 末日 黄昏 军舰",
    aspectRatio: "16:9",
    duration: "12:30",
  },
  {
    id: "w-02",
    index: 2,
    category: "商业广告",
    title: "2030 新品发布会",
    description: "从产品概念到商业成片的一站式视觉表达。",
    seed: "折叠屏手机 科技 发布会",
    aspectRatio: "16:9",
    duration: "0:30",
  },
  {
    id: "w-03",
    index: 3,
    category: "奇幻动画",
    title: "勇者启程",
    description: "奇幻世界、冒险与多城境的连接注释。",
    seed: "奇幻 勇者 云海 夕阳",
    aspectRatio: "16:9",
    duration: "1:05",
  },
  {
    id: "w-04",
    index: 4,
    category: "概念视觉",
    title: "异界天使",
    description: "机械羽翼，神话光辉与异世界美学的糅合短片。",
    seed: "异界天使 机械翼 神话 红白",
    aspectRatio: "16:9",
    duration: "7:09",
  },
  {
    id: "w-05",
    index: 5,
    category: "风格动画",
    title: "列车运行",
    description: "在轨道与异界空间交织的风格动画。",
    seed: "列车 霓虹 赛博 隧道",
    aspectRatio: "16:9",
    duration: "2:10",
  },
  {
    id: "w-06",
    index: 6,
    category: "纪录片",
    title: "未知生物档案",
    description: "以调查体影像，建构世界异兽的秘密蓝图。",
    seed: "未知生物 档案 网格 荧光",
    aspectRatio: "16:9",
    duration: "4:05",
  },
  {
    id: "w-07",
    index: 7,
    category: "探索纪录",
    title: "探索，不止于发现",
    description: "荒原科考站上空的极光与极夜长镜头。",
    seed: "极光 科考站 荒原 夜空",
    aspectRatio: "16:9",
    duration: "3:15",
  },
  {
    id: "w-08",
    index: 8,
    category: "叙事短片",
    title: "时间流逝，但万物依旧永恒",
    description: "在时间与自然的尺度中，凝视文明留下的痕迹。",
    seed: "山谷 河流 时间 遗迹",
    aspectRatio: "16:9",
    duration: "1:40",
  },
  {
    id: "w-09",
    index: 9,
    category: "电影短片",
    title: "回声",
    description: "同一个人，在不同的时间线上，听见彼此。",
    seed: "回声 时间线 双人 走廊",
    aspectRatio: "16:9",
    duration: "5:22",
  },
] as const
