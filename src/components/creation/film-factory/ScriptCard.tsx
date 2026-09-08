"use client"

import Link from "next/link"
import { Clapperboard, Clock, Layers, MoreVertical, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/creation/film-factory/StatusBadge"
import { makePoster } from "@/services/ai/mock-media"
import { relativeTime } from "@/lib/utils"
import { WORK_TYPES } from "@/lib/constants"
import type { ScriptSummary } from "@/lib/serializers/script"

const WORK_TYPE_LABEL = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

/**
 * 影视工厂剧本卡片。
 * 制作中为黄色虚线边框，待推进为蓝色虚线边框（与设计稿一致）。
 */
export function ScriptCard({
  script,
  onDelete,
}: {
  script: ScriptSummary
  onDelete: (script: ScriptSummary) => void
}) {
  const processing = script.processingStatus === "processing"
  const ready = !processing && script.status !== "completed"
  const cover = makePoster(script.title, `${script.title}-${script.id}`, "16:9")

  return (
    <div
      className={
        processing
          ? "rounded-xl border border-dashed border-amber-500/50 bg-amber-500/[0.03] p-3 transition-colors hover:border-amber-500/70"
          : ready
            ? "rounded-xl border border-dashed border-sky-500/50 bg-sky-500/[0.03] p-3 transition-colors hover:border-sky-500/70"
            : "rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700"
      }
    >
      <div className="flex gap-3">
        {/* 缩略图 */}
        <Link
          href={`/creation/film-factory/${script.id}`}
          className="relative block h-[86px] w-[152px] shrink-0 overflow-hidden rounded-lg border border-zinc-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={script.title} className="h-full w-full object-cover opacity-90" />
          <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 py-0.5 text-[10px] text-zinc-300 backdrop-blur">
            {script.targetAspect}
          </span>
        </Link>

        {/* 主体信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link
              href={`/creation/film-factory/${script.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100 hover:text-orange-300"
            >
              {script.title}
            </Link>

            <StatusBadge status={script.status} processing={script.processingStatus} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/creation/film-factory/${script.id}`}>
                    <Clapperboard />
                    打开详情
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => onDelete(script)}>
                  <Trash2 />
                  删除剧本
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {script.genre && (
              <Badge variant="muted" className="font-normal">
                {script.genre}
              </Badge>
            )}
            <Badge variant="muted" className="font-normal">
              {WORK_TYPE_LABEL[script.workType] ?? script.workType}
            </Badge>
            <Badge variant="muted" className="font-normal">
              {script.seriesType === "limited" ? "限定剧" : "连载剧"}
            </Badge>
          </div>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {script.synopsis ?? "暂无简介"}
          </p>

          <div className="mt-2 space-y-1">
            <Progress
              value={processing ? Math.max(script.progress, 8) : script.progress}
              indicatorClassName={processing ? "bg-amber-500" : undefined}
            />
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {script.episodeCount || script.totalEpisodes} 集
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {script.episodeDuration}s/集
              </span>
              <span>{script.progressLabel ?? SCRIPT_LABEL_FALLBACK}</span>
              <span className="ml-auto">编辑于 {relativeTime(script.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SCRIPT_LABEL_FALLBACK = ""
