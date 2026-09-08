/**
 * 工作台精选作品（Mock）。
 * 与设计稿一致：9 件作品，含类型标签、标题、描述。
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
    title: "日迟到了十二年",
    description: "巨兽与未知文明交汇的末日黄昏，一个父亲的十二年等待。",
    seed: "巨兽 末日 黄昏 父女",
    aspectRatio: "16:9",
    duration: "12:30",
  },
  {
    id: "w-02",
    index: 2,
    category: "概念视觉",
    title: "折叠之城",
    description: "垂直生长的城市，在雨夜里折叠出另一重秩序。",
    seed: "折叠城市 雨夜 霓虹",
    aspectRatio: "9:16",
    duration: "0:45",
  },
  {
    id: "w-03",
    index: 3,
    category: "商业广告",
    title: "2030 新品发布会",
    description: "从产品概念到商业成片的一站式视觉表达。",
    seed: "折叠屏手机 科技 发布会",
    aspectRatio: "16:9",
    duration: "0:30",
  },
  {
    id: "w-04",
    index: 4,
    category: "奇幻动画",
    title: "勇者启程",
    description: "奇幻世界、冒险与成长的起点，光与影的第一次交锋。",
    seed: "奇幻 勇者 城堡 夕阳",
    aspectRatio: "16:9",
    duration: "1:20",
  },
  {
    id: "w-05",
    index: 5,
    category: "风格动画",
    title: "纸鸢",
    description: "水墨与三维融合的东方叙事，一纸鸢飞过三十年。",
    seed: "水墨 纸鸢 东方 山水",
    aspectRatio: "16:9",
    duration: "2:10",
  },
  {
    id: "w-06",
    index: 6,
    category: "伪纪录片",
    title: "第九层",
    description: "以纪实镜头语言，记录废土底层的一天。",
    seed: "废土 纪录片 底层 工业",
    aspectRatio: "16:9",
    duration: "4:05",
  },
  {
    id: "w-07",
    index: 7,
    category: "视觉纪录",
    title: "冰与沙",
    description: "两极地貌的视觉对位，极端环境下的生命痕迹。",
    seed: "冰川 沙漠 极地 地貌",
    aspectRatio: "16:9",
    duration: "3:15",
  },
  {
    id: "w-08",
    index: 8,
    category: "氛围短片",
    title: "凌晨四点",
    description: "空城、雨声与便利店灯光，一段没有对白的独白。",
    seed: "凌晨 空城 雨 便利店",
    aspectRatio: "9:16",
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
