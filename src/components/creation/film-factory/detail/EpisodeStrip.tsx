"use client"

import { cn } from "@/lib/utils"
import { useProgressiveList } from "@/hooks/useProgressiveList"
import type { EpisodeDTO } from "@/lib/serializers/script"

/** 分集数超过该阈值时启用渐进渲染。 */
const PROGRESSIVE_THRESHOLD = 60

/**
 * 分集胶片条（详情页横向分集选择）。
 * 胶片齿孔背景 + EP 号 / 标题 chip，横向滚动（滚动条可见，保证能翻到最后一集），当前分集高亮。
 */
export function EpisodeStrip({
  episodes,
  activeId,
  onSelect,
}: {
  episodes: EpisodeDTO[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const { visibleCount, hasMore, sentinelRef, getVisible } = useProgressiveList(episodes.length, {
    initialCount: 40,
    step: 40,
  })
  const visible = episodes.length > PROGRESSIVE_THRESHOLD ? getVisible(episodes) : episodes

  return (
    <div className="relative">
      {/* 胶片齿孔背景（上下两排小孔） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(90deg,#27272a_0_6px,transparent_6px_14px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-[repeating-linear-gradient(90deg,#27272a_0_6px,transparent_6px_14px)]"
      />

      <div className="relative flex gap-1.5 overflow-x-auto px-0.5 py-2">
        {visible.map((episode) => {
          const active = episode.id === activeId
          return (
            <button
              key={episode.id}
              type="button"
              onClick={() => onSelect(episode.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "w-[92px] shrink-0 rounded-md border px-2 py-1.5 text-left transition-colors",
                active
                  ? "border-zinc-300 bg-zinc-800"
                  : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-600",
              )}
            >
              <span className="flex items-center gap-1 text-[10px] tabular-nums">
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    episode.status === "storyboarded"
                      ? "bg-cyan-400"
                      : episode.status === "outlined"
                        ? "bg-sky-400"
                        : "bg-zinc-600",
                  )}
                />
                <span className={active ? "text-zinc-100" : "text-zinc-500"}>
                  EP{String(episode.number).padStart(2, "0")}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-xs",
                  active ? "font-medium text-zinc-50" : "text-zinc-300",
                )}
              >
                {episode.title}
              </span>
            </button>
          )
        })}

        {episodes.length > PROGRESSIVE_THRESHOLD && (
          <div
            ref={sentinelRef}
            className="flex shrink-0 items-center px-3 text-[10px] text-zinc-600"
          >
            {hasMore ? `${visibleCount}/${episodes.length} · 滚动加载` : `全部 ${episodes.length} 集`}
          </div>
        )}
      </div>
    </div>
  )
}
