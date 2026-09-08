"use client"

import { Check, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { WORKFLOW_STAGES } from "@/lib/constants"

const STAGE_ORDER = WORKFLOW_STAGES.map((s) => s.key)

/** 当前剧本状态对应到工作流阶段的索引。 */
function stageIndex(status: string) {
  const index = STAGE_ORDER.indexOf(status as (typeof STAGE_ORDER)[number])
  return index === -1 ? 0 : index
}

/**
 * 工作流阶段标签栏：建档 → 剧本大纲 → 人物/场景 → 拆分镜 → 视频 → 后期。
 * 已完成的阶段打勾，当前阶段高亮，未开始为灰色。
 */
export function WorkflowTabs({
  status,
  processing,
  counts,
}: {
  status: string
  processing: string
  counts: { episodes: number; assets: number; storyboards: number }
}) {
  const current = stageIndex(status)

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-800/80 bg-zinc-950/60 px-4 py-2">
      {WORKFLOW_STAGES.map((stage, index) => {
        const done = index < current
        const active = index === current
        const running = active && processing === "processing"

        return (
          <div key={stage.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : done
                    ? "text-zinc-400"
                    : "text-zinc-600",
              )}
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                  done
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : active
                      ? "border-orange-500/60 bg-orange-500/15 text-orange-400"
                      : "border-zinc-700",
                )}
              >
                {done ? (
                  <Check className="h-2 w-2" />
                ) : running ? (
                  <Loader2 className="h-2 w-2 animate-spin" />
                ) : (
                  <Circle className="h-1 w-1 fill-current" />
                )}
              </span>
              {stage.label}
            </div>

            {index < WORKFLOW_STAGES.length - 1 && (
              <span className="mx-0.5 h-px w-4 bg-zinc-800" />
            )}
          </div>
        )
      })}

      <div className="ml-auto flex items-center gap-3 whitespace-nowrap pl-4 text-[11px] text-zinc-600">
        <span>分集 {counts.episodes}</span>
        <span>资产 {counts.assets}</span>
        <span>分镜 {counts.storyboards}</span>
      </div>
    </div>
  )
}
