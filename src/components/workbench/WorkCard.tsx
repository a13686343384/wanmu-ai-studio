"use client"

import { Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { makePoster } from "@/services/ai/mock-media"
import { cn } from "@/lib/utils"
import type { FeaturedWork } from "@/lib/mock-data/featured-works"

/**
 * 精选作品卡片。
 * 结构：封面（含类型标签 / 序号 / 播放按钮）+ 标题 + 描述。
 */
export function WorkCard({ work, total }: { work: FeaturedWork; total: number }) {
  const cover = makePoster(work.title, work.seed, work.aspectRatio)
  const isPortrait = work.aspectRatio === "9:16"

  return (
    <article
      data-testid="work-card"
      className={cn(
        "group relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-all duration-300",
        "hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]",
        isPortrait ? "w-[240px]" : "w-[320px]",
      )}
    >
      <div className={cn("relative overflow-hidden", isPortrait ? "aspect-[9/16]" : "aspect-video")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={work.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <Badge
          variant="muted"
          className="absolute left-3 top-3 border-white/10 bg-black/50 text-[10px] text-zinc-200 backdrop-blur"
        >
          {work.category}
        </Badge>

        <span className="absolute bottom-3 left-3 text-[11px] tabular-nums text-zinc-300/80">
          {String(work.index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>

        <span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-300 backdrop-blur">
          {work.duration}
        </span>

        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-lg transition-transform duration-300 group-hover:scale-105">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </div>
      </div>

      <div className="space-y-1 p-4">
        <h3 className="truncate text-sm font-medium text-zinc-100">{work.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{work.description}</p>
      </div>
    </article>
  )
}
