"use client"

import { Clock, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EpisodeDTO } from "@/lib/serializers/script"

/**
 * 分集列表（左栏）。
 * 展示集号、标题、摘要、时长与状态，点击切换当前分集。
 */
export function EpisodeList({
  episodes,
  activeId,
  onSelect,
}: {
  episodes: EpisodeDTO[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          分集列表
        </span>
        <span className="text-[11px] text-zinc-600">{episodes.length} 集</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {episodes.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-zinc-600">
            还没有分集
            <br />
            完成 INTAKE 后会自动生成
          </p>
        ) : (
          episodes.map((episode) => {
            const active = episode.id === activeId
            return (
              <button
                key={episode.id}
                type="button"
                onClick={() => onSelect(episode.id)}
                className={cn(
                  "w-full border-b border-zinc-900 px-3 py-2.5 text-left transition-colors",
                  active ? "bg-zinc-800/70" : "hover:bg-zinc-900/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-medium tabular-nums",
                      active ? "text-orange-400" : "text-zinc-500",
                    )}
                  >
                    EP{String(episode.number).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs",
                      active ? "text-zinc-100" : "text-zinc-300",
                    )}
                  >
                    {episode.title}
                  </span>
                  {episode.status === "storyboarded" && (
                    <Play className="h-2.5 w-2.5 text-cyan-400" />
                  )}
                </div>

                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                  {episode.summary ?? episode.content.slice(0, 60)}
                </p>

                <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {episode.duration}s
                  </span>
                  <span>{episode.style ?? "跟随全剧"}</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
