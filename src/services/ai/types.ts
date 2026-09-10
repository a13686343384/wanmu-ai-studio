/**
 * AI 服务抽象层类型定义。
 *
 * 设计目标：把「业务需要的 AI 能力」与「具体供应商」解耦。
 * - UI 与 API Route 只依赖本文件的类型
 * - Mock 实现保证无 API Key 也能完整跑通全流程
 * - 真实实现只需替换 provider，不改调用方
 */

export type MediaKind = "image" | "video" | "audio"

/* ---------------------------- 通用 ---------------------------- */

export interface MediaAsset {
  /** 可访问的资源地址（Mock 下为 data URL） */
  url: string
  /** 视频/音频封面 */
  poster?: string
  /** 时长（秒），视频/音频有效 */
  duration?: number
  width?: number
  height?: number
  mimeType?: string
}

export interface UsageInfo {
  /** 本次消耗积分 */
  tapies: number
  /** 使用的模型 id */
  model: string
}

export interface AIResult<T> {
  data: T
  usage: UsageInfo
}

/* ---------------------------- 文本类 ---------------------------- */

export interface AnalyzeScriptInput {
  title: string
  content: string
  workType: string
  targetAspect: string
  model: string
}

export interface ScriptAnalysis {
  /** AI 推理出的题材 */
  genre: string
  /** 叙事风格 */
  narrativeStyle: string
  /** 视觉风格 */
  visualStyle: string
  /** 服化道风格 */
  costumeStyle: string
  /** 时代背景 */
  era: string
  /** 整体基调 */
  tone: string
  /** 观众画像与需求说明 */
  audienceNotes: string
  /** 允许内容（绿色勾） */
  allowed: string[]
  /** 禁止内容（红色警示） */
  forbidden: string[]
  /** 推荐集数 */
  recommendedEpisodes: number
  /** 推荐单集时长（秒） */
  recommendedDuration: number
  /** 立项方案摘要 */
  treatment: string
  /** 分集灵感（EP01…） */
  episodeIdeas: { number: number; title: string; summary: string }[]
}

export interface ConsultScriptInput {
  scriptTitle: string
  content: string
  model: string
}

export interface ConsultationSuggestion {
  id: string
  /** 问题分类：结构 / 人物 / 节奏 / 台词 / 逻辑 */
  category: string
  /** 严重程度 */
  severity: "high" | "medium" | "low"
  /** 问题描述 */
  issue: string
  /** 建议改法 */
  suggestion: string
  /** 是否必改 */
  mustFix: boolean
}

export interface ConsultScriptResult {
  summary: string
  suggestions: ConsultationSuggestion[]
}

export interface GenerateTextInput {
  prompt: string
  model: string
}

export interface GenerateTextResult {
  text: string
}

export interface ConsultChatInput {
  scriptTitle: string
  /** 正在讨论的诊断建议 */
  suggestion: string
  /** 用户这轮想怎么改 */
  message: string
  model: string
}

export interface ConsultChatResult {
  /** AI 对这轮想法的回应与改法要点 */
  reply: string
}

export interface OptimizeDialogueInput {
  content: string
  model: string
}

export interface OptimizeDialogueResult {
  optimized: string
  changes: string[]
}

export interface GenerateOutlineInput {
  scriptTitle: string
  content: string
  totalEpisodes: number
  episodeDuration: number
  model: string
}

export interface EpisodeOutline {
  number: number
  title: string
  summary: string
  content: string
  duration: number
}

export interface GenerateOutlineResult {
  episodes: EpisodeOutline[]
}

export interface SummarizeEpisodeInput {
  episodeTitle: string
  content: string
  model: string
}

export interface SummarizeEpisodeResult {
  /** AI 复述理解 */
  recap: string
  /** 提炼出的镜组建议 */
  beats: string[]
}

/* ---------------------------- 资产类 ---------------------------- */

export interface ExtractCharactersInput {
  content: string
  model: string
}

export interface CharacterDraft {
  name: string
  description: string
  appearance: string
  personality: string
}

export interface ExtractScenesInput {
  content: string
  model: string
}

export interface SceneDraft {
  name: string
  description: string
  environment: string
  lighting: string
}

export interface ExtractPropsInput {
  content: string
  model: string
}

export interface PropDraft {
  name: string
  description: string
}

/* ---------------------------- 图像 / 视频 / 音频 ---------------------------- */

export interface GenerateImageInput {
  prompt: string
  negativePrompt?: string
  model: string
  aspectRatio: string
  resolution: string
  count?: number
  style?: string | null
  /** 参考素材名列表（用于提示词拼装） */
  references?: { name: string; kind: MediaKind }[]
  /** 工作区（live 模式下 ComfyUI 产物落库用） */
  workspaceId?: string
}

export interface GenerateImageResult {
  images: MediaAsset[]
}

export interface GenerateVideoInput {
  prompt: string
  negativePrompt?: string
  model: string
  aspectRatio: string
  resolution: string
  duration: string
  /** 免分镜图直出：true 表示不使用分镜静帧，直接生成视频 */
  skipStoryboardImage?: boolean
  firstFrameUrl?: string
  lastFrameUrl?: string
  references?: { name: string; kind: MediaKind }[]
  /** 工作区（live 模式下 ComfyUI 产物落库用） */
  workspaceId?: string
}

export interface GenerateVideoResult {
  video: MediaAsset
}

export interface GenerateAudioInput {
  prompt: string
  model: string
  duration: string
  /** 智能歌词 */
  smartLyrics?: boolean
  /** 工作区（live 模式下产物落库用） */
  workspaceId?: string
}

export interface GenerateAudioResult {
  audio: MediaAsset
}

/* ---------------------------- 字幕（ASR） ---------------------------- */

export interface GenerateSubtitleInput {
  /** 音频/视频文件的 URL */
  audioUrl: string
  /** ASR 模型 ID（CustomModel.id） */
  model: string
  /** 语言提示（可选，如 "zh"、"en"） */
  language?: string
  workspaceId?: string
}

export interface SubtitleSegment {
  start: number
  end: number
  text: string
}

export interface GenerateSubtitleResult {
  /** SRT 格式字幕内容 */
  srt: string
  /** 结构化分段 */
  segments: SubtitleSegment[]
}

/* ---------------------------- 分镜 ---------------------------- */

export interface SplitStoryboardsInput {
  episodeTitle: string
  content: string
  mode: "text" | "image" | "video"
  model: string
}

export interface StoryboardDraft {
  number: number
  shotType: string
  description: string
  dialogue?: string
  action?: string
  camera?: string
  duration: number
  /** 所属镜组标题（如 B01·闪回·有剧情镜），同组连续分镜为一段 */
  segmentTitle?: string
  /** 镜组说明 / 衔接建议 */
  segmentNote?: string
}

export interface SplitStoryboardsResult {
  storyboards: StoryboardDraft[]
}

/* ---------------------------- 服务接口 ---------------------------- */

export interface AIService {
  writeScript(input: WriteScriptInput): Promise<AIResult<WriteScriptResult>>
  analyzeScript(input: AnalyzeScriptInput): Promise<AIResult<ScriptAnalysis>>
  generateText(input: GenerateTextInput): Promise<AIResult<GenerateTextResult>>
  consultScript(
    input: ConsultScriptInput,
  ): Promise<AIResult<ConsultScriptResult>>
  consultChat(input: ConsultChatInput): Promise<AIResult<ConsultChatResult>>
  optimizeDialogue(
    input: OptimizeDialogueInput,
  ): Promise<AIResult<OptimizeDialogueResult>>
  generateOutline(
    input: GenerateOutlineInput,
  ): Promise<AIResult<GenerateOutlineResult>>
  summarizeEpisode(
    input: SummarizeEpisodeInput,
  ): Promise<AIResult<SummarizeEpisodeResult>>

  extractCharacters(
    input: ExtractCharactersInput,
  ): Promise<AIResult<CharacterDraft[]>>
  extractScenes(input: ExtractScenesInput): Promise<AIResult<SceneDraft[]>>
  extractProps(input: ExtractPropsInput): Promise<AIResult<PropDraft[]>>

  generateImage(
    input: GenerateImageInput,
  ): Promise<AIResult<GenerateImageResult>>
  generateVideo(
    input: GenerateVideoInput,
  ): Promise<AIResult<GenerateVideoResult>>
  generateAudio(
    input: GenerateAudioInput,
  ): Promise<AIResult<GenerateAudioResult>>
  generateSubtitle(
    input: GenerateSubtitleInput,
  ): Promise<AIResult<GenerateSubtitleResult>>

  splitStoryboards(
    input: SplitStoryboardsInput,
  ): Promise<AIResult<SplitStoryboardsResult>>
}

export interface WriteScriptInput {
  title: string
  idea: string
  genre: string
  totalEpisodes: number
  episodeDuration: number
  model: string
  blueprint: string
  instruction?: string
  episodeNumber?: number
  characters: { name: string; description: string }[]
  episodes: {
    number: number
    title: string
    summary: string
    content: string
  }[]
}
export interface WriteScriptResult {
  blueprint: string
  characters: { name: string; description: string }[]
  episodes: {
    number: number
    title: string
    summary: string
    content: string
  }[]
  reply: string
}
