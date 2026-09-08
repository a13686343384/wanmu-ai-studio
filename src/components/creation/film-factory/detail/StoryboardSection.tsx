"use client"

import { Clapperboard, Loader2, Scissors, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { StoryboardCard, type StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

/**
 * 分镜区（中栏下半部分）。
 * 未拆分镜时给出引导与两个入口（批量生成 / 先让 AI 复述理解本集）；
 * 已拆分镜时展示镜头卡片网格。
 */
export function StoryboardSection({
  storyboards,
  loading,
  busyId,
  generating,
  progress,
  progressLabel,
  hasEpisode,
  onSplit,
  onRecap,
  onGenerateImage,
  onGenerateVideo,
  onEdit,
}: {
  storyboards: StoryboardDTO[]
  loading: boolean
  busyId: string | null
  generating: boolean
  progress: number
  progressLabel: string
  hasEpisode: boolean
  onSplit: () => void
  onRecap: () => void
  onGenerateImage: (storyboard: StoryboardDTO) => void
  onGenerateVideo: (storyboard: StoryboardDTO) => void
  onEdit: (storyboard: StoryboardDTO) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          分镜 · 镜组
        </span>
        {storyboards.length > 0 && (
          <span className="text-[11px] text-zinc-600">{storyboards.length} 个镜头</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-7" onClick={onRecap} disabled={!hasEpisode}>
            <Sparkles className="h-3.5 w-3.5" />
            先让 AI 复述理解本集
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={onSplit} disabled={!hasEpisode}>
            <Scissors className="h-3.5 w-3.5" />
            {storyboards.length > 0 ? "重新拆分镜" : "批量生成分镜"}
          </Button>
        </div>
      </div>

      {generating && (
        <div className="space-y-1.5 border-b border-zinc-800/80 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-orange-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressLabel || "处理中…"}
            </span>
            <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} indicatorClassName="bg-orange-500" />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40"
              />
            ))}
          </div>
        ) : storyboards.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 text-center">
            <Clapperboard className="h-5 w-5 text-zinc-600" />
            <p className="mt-2 text-sm text-zinc-300">尚未拆分镜</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-600">
              准备好了吗？AI 会按本集内容切成镜头。你可以先让 AI 复述理解本集，确认无误后再拆；
              也可以直接出图或出视频，跳过九宫格。
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button variant="brand" size="sm" onClick={onSplit} disabled={!hasEpisode}>
                <Wand2 className="h-3.5 w-3.5" />
                批量生成分镜
              </Button>
              <Button variant="outline" size="sm" onClick={onRecap} disabled={!hasEpisode}>
                <Sparkles className="h-3.5 w-3.5" />
                先让 AI 复述理解本集（推荐）
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            {storyboards.map((storyboard) => (
              <StoryboardCard
                key={storyboard.id}
                storyboard={storyboard}
                busy={busyId === storyboard.id}
                onGenerateImage={onGenerateImage}
                onGenerateVideo={onGenerateVideo}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
