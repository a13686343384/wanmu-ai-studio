/**
 * 全局常量：品牌信息、导航结构、枚举选项、模型清单。
 * 所有页面与组件应从此处读取枚举值，避免散落的字面量。
 */

export const APP_NAME = "Manvo TV"
export const APP_NAME_CN = "万幕生"
export const APP_TAGLINE = "AI 影视创作平台"

/* ---------------------------- 全局导航 ---------------------------- */

export interface NavItem {
  label: string
  href: string
  icon: string
  hasDropdown?: boolean
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "工作台", href: "/", icon: "Home" },
  { label: "画布", href: "/canvas", icon: "LayoutGrid" },
  { label: "创作中心", href: "/creation", icon: "Sparkles", hasDropdown: true },
  { label: "插件", href: "/plugins", icon: "Puzzle" },
  { label: "联系我们", href: "/contact", icon: "MessageSquare" },
] as const

export interface CreationCenterItem {
  label: string
  href: string
  icon: string
  description: string
  badge?: "new"
}

export const CREATION_CENTER_ITEMS: readonly CreationCenterItem[] = [
  {
    label: "剧本工厂",
    href: "/creation/script-factory",
    icon: "FolderOpen",
    description: "标准管线：拆本、大纲、分镜、成片一条龙",
    badge: "new",
  },
  {
    label: "影视工厂",
    href: "/creation/film-factory",
    icon: "Film",
    description: "影视级流程，会诊、台词、后期逐段打磨",
  },
  {
    label: "剧本创作",
    href: "/creation/script-writing",
    icon: "PenTool",
    description: "从一个点子开始，写出整部剧本",
  },
  {
    label: "电商设计室",
    href: "/creation/ecommerce",
    icon: "ShoppingBag",
    description: "商品图、套图、场景图批量产出",
  },
] as const

/* ---------------------------- 影视工厂枚举 ---------------------------- */

export type WorkType = "vertical_short" | "horizontal_short" | "micro_film" | "anime"
export type SeriesType = "limited" | "serial"
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:3" | "3:4"
export type ScriptProcessingMode = "consult_optimize" | "keep_original"
export type ExecutionMode = "step_by_step" | "full_auto"

export const WORK_TYPES: readonly { value: WorkType; label: string; note: string }[] = [
  { value: "vertical_short", label: "竖屏短剧", note: "9:16 · 单集 60-120s" },
  { value: "horizontal_short", label: "横屏短剧", note: "16:9 · 单集 60-120s" },
  { value: "micro_film", label: "微电影", note: "16:9 · 单集 5-15min" },
  { value: "anime", label: "动漫", note: "9:16 / 16:9" },
] as const

export const SERIES_TYPES: readonly { value: SeriesType; label: string; description: string }[] = [
  { value: "limited", label: "限定剧", description: "固定集数，拍完即完结（之后仍可手动续写）" },
  { value: "serial", label: "连载剧", description: "可持续续集，集数不设上限" },
] as const

export const ASPECT_RATIOS: readonly { value: AspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 竖屏" },
  { value: "16:9", label: "16:9 横屏" },
  { value: "1:1", label: "1:1 方屏" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
] as const

export const SCRIPT_PROCESSING_MODES: readonly {
  value: ScriptProcessingMode
  label: string
  description: string
  recommended?: boolean
}[] = [
  {
    value: "consult_optimize",
    label: "会诊 + 台词优化",
    description:
      "建档时请剧本医生会诊全剧，出诊断报告，默认「逐步确认」——你审阅后勾选要改的项再一键修改，不勾选改原文；也可选全自动一步到位。会诊与台词可分别指定模型。",
    recommended: true,
  },
  {
    value: "keep_original",
    label: "原样保留",
    description: "完全不动你的原文，直接按集切开，最快，但内容就是你贴进来的样子。",
  },
] as const

export const EXECUTION_MODES: readonly {
  value: ExecutionMode
  label: string
  description: string
  recommended?: boolean
}[] = [
  {
    value: "step_by_step",
    label: "逐步确认",
    description:
      "建档只做会诊出诊断报告，不动你的原文。进详情页后你审阅诊断、勾选要改的项再一键修改。改完可手动润色，满意了再做台词 —— 全程你把关。",
    recommended: true,
  },
  {
    value: "full_auto",
    label: "全自动一步到位",
    description:
      "建档时直接按会诊修改全剧 + 优化台词 + 自动复审。省事但不经你确认，改动可能较大（原文始终保留，可回退重拆）。",
  },
] as const

/* ---------------------------- AI 模型清单 ---------------------------- */

export interface AIModel {
  id: string
  name: string
  cost: number
  builtIn: boolean
  note: string
}

/** 文本推理模型（INTAKE / 大纲 / 会诊 / 台词） */
export const TEXT_MODELS: readonly AIModel[] = [
  { id: "ovlm-6", name: "OVLM 6", cost: 5, builtIn: true, note: "免配置直接用" },
  { id: "ovlm-5.6", name: "OVLM 5.6", cost: 3, builtIn: true, note: "免配置直接用" },
  { id: "gvlm-3.1-pro", name: "GVLM 3.1 Pro", cost: 3, builtIn: true, note: "免配置直接用" },
] as const

/** 图片生成模型（工作台 / 资产 / 分镜出图） */
export const IMAGE_MODELS: readonly AIModel[] = [
  { id: "all-in-one", name: "全能图片", cost: 14, builtIn: true, note: "免配置直接用" },
  { id: "all-in-one-low", name: "全能图片（低画质）", cost: 2, builtIn: true, note: "免配置直接用" },
  { id: "seedream-5.0-pro", name: "Seedream 5.0 Pro", cost: 4, builtIn: true, note: "免配置直接用" },
  { id: "man-image-pro", name: "Man Image Pro", cost: 20, builtIn: true, note: "免配置直接用" },
  { id: "man-image-v2", name: "Man Image V2", cost: 10, builtIn: true, note: "免配置直接用" },
  { id: "man-image-v2-lite", name: "Man Image V2 Lite", cost: 2, builtIn: true, note: "免配置直接用" },
] as const

/** 视频生成模型 */
export const VIDEO_MODELS: readonly AIModel[] = [
  { id: "seedance-2.0", name: "Seedance 2.0 (HuoShan)", cost: 50, builtIn: true, note: "免配置直接用" },
  { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast (HuoShan)", cost: 18, builtIn: true, note: "免配置直接用" },
  { id: "seedance-2.0-mini", name: "Seedance 2.0 Mini (HuoShan)", cost: 9, builtIn: true, note: "免配置直接用" },
  { id: "minimax-h3-768p", name: "MiniMax H3 (768P 9图3视频)", cost: 105, builtIn: true, note: "免配置直接用" },
] as const

/** 音频生成模型 */
export const AUDIO_MODELS: readonly AIModel[] = [
  { id: "mv-audio-5.5", name: "MV Audio 5.5", cost: 50, builtIn: true, note: "免配置直接用" },
] as const

/** 视频生成能力（功能下拉） */
export const VIDEO_FEATURES = [
  {
    id: "reference-to-video",
    name: "全能参考视频",
    description: "自由组合图片 + ≤15s 视频 + ≤15s 音频",
  },
  {
    id: "first-last-frame",
    name: "首尾帧生视频",
    description: "指定首帧与末帧补全中间",
  },
] as const

/* ---------------------------- 状态枚举 ---------------------------- */

export type ScriptStatus =
  | "intake"
  | "outlining"
  | "assets"
  | "storyboarding"
  | "video"
  | "post_production"
  | "completed"

export type ProcessingStatus = "idle" | "processing" | "completed" | "error"

export const SCRIPT_STATUS_LABEL: Record<ScriptStatus, string> = {
  intake: "建档中",
  outlining: "大纲就绪",
  assets: "资产就绪",
  storyboarding: "分镜就绪",
  video: "出片中",
  post_production: "后期中",
  completed: "已完成",
}

export const SCRIPT_STATUS_COLOR: Record<ScriptStatus, string> = {
  intake: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  outlining: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  assets: "text-violet-400 border-violet-500/30 bg-violet-500/10",
  storyboarding: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  video: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  post_production: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10",
  completed: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
}

/** 影视工厂工作流阶段（顶部标签栏） */
export const WORKFLOW_STAGES = [
  { key: "intake", label: "建档" },
  { key: "outlining", label: "剧本大纲" },
  { key: "assets", label: "人物/场景" },
  { key: "storyboarding", label: "拆分镜" },
  { key: "video", label: "视频" },
  { key: "post_production", label: "后期" },
] as const

/* ---------------------------- 其他 ---------------------------- */

export const MEDIA_TYPES = [
  { value: "video", label: "视频", accent: "text-rose-400" },
  { value: "image", label: "图片", accent: "text-sky-400" },
  { value: "audio", label: "音频", accent: "text-violet-400" },
] as const

export const RESOLUTIONS = ["480p", "720p", "1080p", "1K", "2K"] as const
export const DURATIONS = ["5s", "10s", "15s"] as const
export const IMAGE_COUNTS = [1, 2, 3, 4] as const
export const MAX_TEAMS_PER_USER = 5
