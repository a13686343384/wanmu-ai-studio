"use client"

import { useState } from "react"
import { Clapperboard, ImageIcon, Loader2, Scissors, Sparkles, Video, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { StoryboardCard, type StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { FadeIn } from "@/components/shared/motion"
import { cn } from "@/lib/utils"

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
  const [filter, setFilter] = useState<"all" | "image" | "video">("all")
  const filtered =
    filter === "image"
      ? storyboards.filter((item) => item.imageUrl)
      : filter === "video"
        ? storyboards.filter((item) => item.videoUrl)
        : storyboards

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wider text-zinc-500">
          分镜 · 镜组
        </span>
        {storyboards.length > 0 && (
          <span className="text-[11px] tabular-nums text-zinc-600">{storyboards.length} 个镜头</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {storyboards.length > 0 && (
            <div className="flex items-center rounded-md border border-zinc-800 p-0.5">
              {(
                [
                  { value: "all", label: "全部", icon: Clapperboard },
                  { value: "image", label: "已出图", icon: ImageIcon },
                  { value: "video", label: "已出视频", icon: Video },
                ] as const
              ).map((option) => {
                const Icon = option.icon
                const active = filter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    aria-label={`筛选${option.label}`}
                    className={cn(
                      "flex items-center gap-1 rounded p-1.5 text-[10px] transition-colors",
                      active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {active && <span>{option.label}</span>}
                  </button>
                )
              })}
            </div>
          )}

          <Button variant="ghost" size="sm" className="h-7" onClick={onRecap} disabled={!hasEpisode}>
            <Sparkles className="h-3.5 w-3.5" />
            先让 AI 复述理解本集
          </Button>
          <Button variant="inverse" size="sm" className="h-7" onClick={onSplit} disabled={!hasEpisode}>
            <Scissors className="h-3.5 w-3.5" />
            {storyboards.length > 0 ? "重新拆分镜" : "批量生成"}
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
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-video rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 && storyboards.length > 0 ? (
          <div className="flex h-full min-h-[220px] items-center justify-center text-center text-xs text-zinc-600">
            没有符合筛选条件的镜头
          </div>
        ) : storyboards.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="尚未拆分镜"
            description="准备好了吗？AI 会按本集内容切成镜头。你可以先让 AI 复述理解本集，确认无误后再拆；也可以直接出图或出视频，跳过九宫格。"
            className="h-full min-h-[220px] justify-center"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="brand" size="sm" onClick={onSplit} disabled={!hasEpisode}>
                  <Wand2 className="h-3.5 w-3.5" />
                  批量生成分镜
                </Button>
                <Button variant="outline" size="sm" onClick={onRecap} disabled={!hasEpisode}>
                  <Sparkles className="h-3.5 w-3.5" />
                  先让 AI 复述理解本集（推荐）
                </Button>
              </div>
            }
          />
        ) : (
          <FadeIn key={filter}>
            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
              {filtered.map((storyboard) => (
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
          </FadeIn>
        )}
      </div>
    </div>
  )
}
