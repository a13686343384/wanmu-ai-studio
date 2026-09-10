"use client"

import { Check, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const STAGES = ["排队中", "生成关键帧", "合成视频", "编码输出", "完成"]

/**
 * 视频生成进度条。
 * 展示当前阶段、整体百分比与已完成 / 总数。
 */
export function VideoProgressBar({
  progress,
  label,
  done,
  total,
  className,
}: {
  progress: number
  label?: string
  done?: number
  total?: number
  className?: string
}) {
  const stageIndex = Math.min(
    STAGES.length - 1,
    Math.floor((progress / 100) * (STAGES.length - 1)),
  )

  return (
    <div className={cn("space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3", className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-orange-300">
          {progress >= 100 ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {label ?? STAGES[stageIndex]}
        </span>
        <span className="flex items-center gap-2">
          {total !== undefined && (
            <span className="text-zinc-500">
              {done ?? 0}/{total}
            </span>
          )}
          <span className="tabular-nums text-zinc-500">{Math.round(progress)}%</span>
        </span>
      </div>

      <Progress value={progress} indicatorClassName="bg-orange-500" />

      <div className="flex items-center gap-1.5">
        {STAGES.map((stage, index) => (
          <span
            key={stage}
            className={cn(
              "flex-1 rounded-sm px-1 py-0.5 text-center text-[10px] transition-colors",
              index < stageIndex
                ? "bg-emerald-500/15 text-emerald-400"
                : index === stageIndex
                  ? "bg-orange-500/15 text-orange-300"
                  : "bg-zinc-900 text-zinc-600",
            )}
          >
            {stage}
          </span>
        ))}
      </div>
    </div>
  )
}
