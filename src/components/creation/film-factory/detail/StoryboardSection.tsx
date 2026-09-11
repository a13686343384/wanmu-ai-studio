"use client"

import { useState } from "react"
import {
  Clapperboard,
  ImageIcon,
  Loader2,
  Scissors,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StoryboardCard,
  type StoryboardDTO,
} from "@/components/creation/film-factory/detail/StoryboardCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { FadeIn } from "@/components/shared/motion"
import { StoryboardChecks } from "./StoryboardChecks"
import { SegmentRefsDialog, SegmentAssetsDialog } from "./SegmentDialogs"
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
  splitPhase,
  aspectRatio = "16:9",
  videoMode = false,
  onBatchVideo,
  batchVideoBusy = false,
  assets,
  onSegmentFill,
  onRefsSaved,
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
  /** 拆分/生成阶段上报：居中展示「AI 正在拆分镜…」等 */
  splitPhase?: { active: boolean; label: string; mode: string } | null
  /** 画幅（视频/首帧占位框按它动态决定） */
  aspectRatio?: string
  /** 视频阶段：未出视频的镜卡显示「生成视频」占位框 */
  videoMode?: boolean
  onSplit: () => void
  /** 批量生成所有未出视频的镜头（视频阶段右上角按钮） */
  onBatchVideo: () => void
  batchVideoBusy?: boolean
  /** 资产清单（编辑整段引用用） */
  assets: {
    characters: { id: string; name: string; imageUrl: string | null; costumes: { id: string; name: string }[] }[]
    scenes: { id: string; name: string; imageUrl: string | null }[]
    props: { id: string; name: string; imageUrl: string | null }[]
  }
  /** 批量补全某段缺首帧图的分镜（顺序逐镜生成） */
  onSegmentFill: (items: { id: string; number: number; description: string; dialogue: string | null; imageUrl: string | null; duration: number | null }[]) => Promise<void>
  /** 引用保存后刷新 */
  onRefsSaved: () => void
  onRecap: () => void
  onGenerateImage: (storyboard: StoryboardDTO) => void
  onGenerateVideo: (storyboard: StoryboardDTO) => void
  onEdit: (storyboard: StoryboardDTO) => void
}) {
  const [filter, setFilter] = useState<"all" | "image" | "video">("all")
  const [refsSegment, setRefsSegment] = useState<string | null>(null)
  const [assetsSegment, setAssetsSegment] = useState<string | null>(null)
  const filtered =
    filter === "image"
      ? storyboards.filter((item) => item.imageUrl)
      : filter === "video"
        ? storyboards.filter((item) => item.videoUrl)
        : storyboards

  // 镜组（段）分组：同 segmentTitle 的连续分镜为一段；无标题时按每 6 镜自动分组
  const segments = (() => {
    const groups: { title: string; items: StoryboardDTO[] }[] = []
    for (const item of filtered) {
      const title = item.segmentTitle?.trim()
      const last = groups[groups.length - 1]
      if (title && last?.title === title) last.items.push(item)
      else if (title) groups.push({ title, items: [item] })
      else if (last && !last.title.startsWith("B") && !item.segmentTitle)
        last.items.push(item)
      else
        groups.push({
          title: `B${String(groups.length + 1).padStart(2, "0")}·镜组`,
          items: [item],
        })
    }
    return groups
  })()
  const totalDuration = Math.round(
    filtered.reduce((sum, item) => sum + (item.duration ?? 0), 0),
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium tracking-wider text-zinc-500">
          分镜 · 镜组
        </span>
        {storyboards.length > 0 && (
          <span className="text-[11px] tabular-nums text-zinc-600">
            {storyboards.length} 个镜头
          </span>
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
                      active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {active && <span>{option.label}</span>}
                  </button>
                )
              })}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={onRecap}
            disabled={!hasEpisode}
          >
            <Sparkles className="h-3.5 w-3.5" />
            先让 AI 复述理解本集
          </Button>
          {storyboards.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={onSplit}
              disabled={!hasEpisode}
            >
              <Scissors className="h-3.5 w-3.5" />
              重新拆分镜
            </Button>
          )}
          {videoMode && storyboards.length > 0 ? (
            <Button
              variant="inverse"
              size="sm"
              className="h-7"
              onClick={onBatchVideo}
              disabled={!hasEpisode || batchVideoBusy}
            >
              {batchVideoBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scissors className="h-3.5 w-3.5" />
              )}
              批量生成视频
            </Button>
          ) : storyboards.length > 0 ? (
            <Button
              variant="inverse"
              size="sm"
              className="h-7"
              onClick={() => setAssetsSegment("__all__")}
              disabled={!hasEpisode}
            >
              <Scissors className="h-3.5 w-3.5" />
              批量生成
            </Button>
          ) : (
            <Button
              variant="inverse"
              size="sm"
              className="h-7"
              onClick={onSplit}
              disabled={!hasEpisode}
            >
              <Scissors className="h-3.5 w-3.5" />
              批量生成
            </Button>
          )}
        </div>
      </div>

      {generating && !splitPhase?.active && (
        <div className="space-y-1.5 border-b border-zinc-800/80 px-3 py-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-orange-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progressLabel || "处理中…"}
            </span>
            <span className="tabular-nums text-zinc-500">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} indicatorClassName="bg-orange-500" />
        </div>
      )}

      {/* 拆分/生成阶段：顶部「分镜 ■停止」chip（原型 image5） */}
      {splitPhase?.active && (
        <div className="flex items-center justify-end border-b border-zinc-800/80 px-3 py-1.5">
          <span className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
            <span className="tabular-nums">
              分镜 {progressLabel ? `· ${progressLabel}` : ""}
            </span>
            <span
              aria-hidden
              className="ml-1 inline-block h-2.5 w-2.5 rounded-[2px] bg-amber-400"
            />
            停止
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {/* 拆分进行中：居中「AI 正在拆分镜…」（原型 image4/5） */}
        {splitPhase?.active && (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-300">{splitPhase.label}</p>
            <p className="text-[11px] text-zinc-600">
              预计 5-10 秒，完成后自动生成到下方
            </p>
          </div>
        )}
        {!splitPhase?.active && !loading && storyboards.length > 0 && (
          <StoryboardChecks
            items={storyboards}
            aspectRatio={aspectRatio}
            onEdit={onEdit}
            onGenerateImage={onGenerateImage}
            busy={generating || !!busyId}
          />
        )}
        {loading ? (
          <div
            className="grid grid-cols-2 gap-2.5 xl:grid-cols-3"
            aria-busy="true"
          >
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
              <Button
                variant="brand"
                size="sm"
                onClick={onRecap}
                disabled={!hasEpisode}
              >
                <Sparkles className="h-3.5 w-3.5" />
                先让 AI 复述理解本集（推荐）
              </Button>
            }
          />
        ) : (
          <FadeIn key={filter}>
            <div className="space-y-4">
              {segments.map((segment) => {
                const segDuration = Math.round(
                  segment.items.reduce((sum, item) => sum + (item.duration ?? 0), 0),
                )
                const missingImages = segment.items.filter((item) => !item.imageUrl)
                const allImaged = missingImages.length === 0
                const seconds = segment.items
                  .reduce((sum, item) => sum + (item.duration ?? 0), 0)
                  .toFixed(1)
                return (
                  <section
                    key={segment.title + segment.items[0]?.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/30"
                  >
                    {/* 段头（原型：段标题 + 时长/镜数 + 状态 chips + 建议） */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
                      <span className="text-xs font-medium text-zinc-200">
                        {segment.title}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {segDuration}s · {segment.items.length} 个镜头
                      </span>
                      {!allImaged && (
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-300">
                          拆分镜未生成 {missingImages.length}
                        </span>
                      )}
                      {allImaged && (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                          全镜组出图
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busyId !== null || generating}
                        onClick={() => setAssetsSegment(segment.title)}
                        className="ml-auto rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 transition-colors hover:border-orange-500/60 hover:text-orange-300 disabled:opacity-50"
                      >
                        段资产
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null || generating}
                        onClick={() => setRefsSegment(segment.title)}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 transition-colors hover:border-orange-500/60 hover:text-orange-300 disabled:opacity-50"
                      >
                        编辑引用
                      </button>
                      {missingImages.length > 0 && (
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-300">
                          建议优先补齐
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 p-3 xl:grid-cols-3">
                      {segment.items.map((storyboard) => (
                        <StoryboardCard
                          key={storyboard.id}
                          storyboard={storyboard}
                          busy={busyId === storyboard.id}
                          aspectRatio={aspectRatio}
                          videoMode={videoMode}
                          onGenerateImage={onGenerateImage}
                          onGenerateVideo={onGenerateVideo}
                          onEdit={onEdit}
                          onEditRefs={() => setRefsSegment(segment.title)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </FadeIn>
        )}
      </div>

      {refsSegment &&
        (() => {
          const segment = segments.find((s) => s.title === refsSegment)
          if (!segment) return null
          return (
            <SegmentRefsDialog
              open
              onOpenChange={(open) => !open && setRefsSegment(null)}
              segmentTitle={segment.title}
              items={segment.items}
              assets={assets}
              onSaved={onRefsSaved}
            />
          )
        })()}

      {assetsSegment &&
        (() => {
          const segment =
            assetsSegment === "__all__"
              ? { title: "本集全部分镜", items: storyboards }
              : segments.find((s) => s.title === assetsSegment)
          if (!segment) return null
          return (
            <SegmentAssetsDialog
              open
              onOpenChange={(open) => !open && setAssetsSegment(null)}
              segmentTitle={segment.title}
              items={segment.items}
              aspectRatio={aspectRatio}
              onGenerateImage={(item) => onSegmentFill([item])}
              onDone={onRefsSaved}
            />
          )
        })()}
    </div>
  )
}
