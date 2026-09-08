/**
 * 剧本数据序列化：Prisma 记录 → 前端使用的摘要对象。
 * 放在独立模块，避免在 route.ts 中导出非 HTTP 处理函数。
 */

export interface ScriptSummary {
  id: string
  title: string
  synopsis: string | null
  genre: string | null
  status: string
  processingStatus: string
  progress: number
  progressLabel: string | null
  workType: string
  seriesType: string
  targetAspect: string
  totalEpisodes: number
  episodeDuration: number
  workspaceId: string
  workspaceName: string
  isPersonal: boolean
  episodeCount: number
  characterCount: number
  sceneCount: number
  propCount: number
  createdAt: string
  updatedAt: string
}

export interface ScriptRecord {
  id: string
  title: string
  synopsis: string | null
  genre: string | null
  status: string
  processingStatus: string
  progress: number
  progressLabel: string | null
  workType: string
  seriesType: string
  targetAspect: string
  totalEpisodes: number
  episodeDuration: number
  workspaceId: string
  createdAt: Date
  updatedAt: Date
  workspace?: { name: string; isPersonal: boolean } | null
  _count?: { episodes: number; characters: number; scenes: number; props: number }
}

export function toScriptSummary(script: ScriptRecord): ScriptSummary {
  return {
    id: script.id,
    title: script.title,
    synopsis: script.synopsis,
    genre: script.genre,
    status: script.status,
    processingStatus: script.processingStatus,
    progress: script.progress,
    progressLabel: script.progressLabel,
    workType: script.workType,
    seriesType: script.seriesType,
    targetAspect: script.targetAspect,
    totalEpisodes: script.totalEpisodes,
    episodeDuration: script.episodeDuration,
    workspaceId: script.workspaceId,
    workspaceName: script.workspace?.name ?? "",
    isPersonal: script.workspace?.isPersonal ?? true,
    episodeCount: script._count?.episodes ?? 0,
    characterCount: script._count?.characters ?? 0,
    sceneCount: script._count?.scenes ?? 0,
    propCount: script._count?.props ?? 0,
    createdAt: script.createdAt.toISOString(),
    updatedAt: script.updatedAt.toISOString(),
  }
}
