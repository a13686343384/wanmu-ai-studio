"use client"

import { memo } from "react"
import { Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { makePoster } from "@/services/ai/mock-media"
import { cn } from "@/lib/utils"
import type { FeaturedWork } from "@/lib/mock-data/featured-works"

/**
 * 精选作品卡片。
 * 结构：封面（左上类型标签 + 序号、右上时长、居中常显播放按钮）+ 下方标题与描述。
 */
export const WorkCard = memo(function WorkCard({ work, total }: { work: FeaturedWork; total: number }) {
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
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <Badge
            variant="muted"
            className="border-white/10 bg-black/50 text-[10px] text-zinc-200 backdrop-blur"
          >
            {work.category}
          </Badge>
          <span className="text-[10px] tabular-nums text-zinc-300/80">
            {String(work.index).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <span className="absolute right-3 top-3 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-300 backdrop-blur">
          {work.duration}
        </span>

        <span className="absolute inset-y-0 right-4 flex items-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </span>
      </div>

      <div className="space-y-1 p-4">
        <h3 className="truncate text-sm font-medium text-zinc-100">{work.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{work.description}</p>
      </div>
    </article>
  )
})
