"use client"

import { Check, Circle, History, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { WORKFLOW_STAGES } from "@/lib/constants"
import type { ScriptDetail } from "@/lib/serializers/script"

const STAGE_ORDER = WORKFLOW_STAGES.map((s) => s.key)

/** 当前剧本状态对应到工作流阶段的索引。 */
function stageIndex(status: string) {
  const index = STAGE_ORDER.indexOf(status as (typeof STAGE_ORDER)[number])
  return index === -1 ? 0 : index
}

/**
 * 工作流步骤条（与设计稿一致）：
 * 左侧为剧本元信息（剧型 / 集数 / 历史），右侧为 ①建档 → ②剧本大纲 → … 的横向步骤。
 * 已完成阶段绿色打勾，当前阶段橙色高亮，未开始灰色。
 */
export function WorkflowTabs({
  script,
  processing,
  counts,
}: {
  script: Pick<ScriptDetail, "status" | "processingStatus" | "seriesType" | "totalEpisodes" | "updatedAt">
  processing: string
  counts: { episodes: number; assets: number; storyboards: number }
}) {
  const current = stageIndex(script.status)

  return (
    <div className="flex items-center gap-4 overflow-x-auto border-b border-zinc-800/80 bg-zinc-950/60 px-4 py-2">
      {/* 剧本元信息 */}
      <div className="flex shrink-0 items-center gap-2 border-r border-zinc-800/80 pr-4 text-[11px] text-zinc-500">
        <span>{script.seriesType === "limited" ? "限定剧" : "连载剧"}</span>
        <span className="text-zinc-700">·</span>
        <span>{counts.episodes || script.totalEpisodes} 集</span>
        <span className="flex items-center gap-1 text-zinc-600">
          <History className="h-3 w-3" />
          更新于 {script.updatedAt.slice(5, 16).replace("T", " ")}
        </span>
      </div>

      {/* 步骤条 */}
      <div className="flex items-center">
        {WORKFLOW_STAGES.map((stage, index) => {
          const done = index < current
          const active = index === current
          const running = active && processing === "processing"
          const isLast = index === WORKFLOW_STAGES.length - 1

          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap text-xs transition-colors",
                  active ? "font-medium text-orange-300" : done ? "text-zinc-400" : "text-zinc-600",
                )}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] tabular-nums",
                    active
                      ? "border-orange-500 bg-orange-500 text-zinc-950"
                      : done
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                        : "border-zinc-700 text-zinc-600",
                  )}
                >
                  {done ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : running ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : active ? (
                    index + 1
                  ) : (
                    <Circle className="h-1 w-1 fill-current" />
                  )}
                </span>
                {stage.label}
              </div>

              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-px w-7",
                    index < current && current > 0
                      ? "bg-emerald-500/60"
                      : index === current || index === current - 1
                        ? "power-line"
                        : "bg-zinc-800",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-3 whitespace-nowrap pl-4 text-[11px] text-zinc-600 md:flex">
        <span>资产 {counts.assets}</span>
        <span>分镜 {counts.storyboards}</span>
      </div>
    </div>
  )
}
