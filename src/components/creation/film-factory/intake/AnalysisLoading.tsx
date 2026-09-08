"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const STEPS = [
  "通读全本剧本",
  "切分集数与时序",
  "推断时代 / 题材 / 基调",
  "推导视觉与服化道风格",
  "生成立项方案与分集灵感",
]

/**
 * AI 分析 Loading。
 * 逐条点亮分析步骤，并展示百分比进度，营造真实推理过程。
 */
export function AnalysisLoading({
  active,
  progress,
  label,
}: {
  active: boolean
  progress: number
  label?: string | null
}) {
  const [visibleStep, setVisibleStep] = useState(0)

  useEffect(() => {
    if (!active) {
      setVisibleStep(0)
      return
    }
    setVisibleStep(0)
    const timer = window.setInterval(() => {
      setVisibleStep((step) => (step < STEPS.length - 1 ? step + 1 : step))
    }, 900)
    return () => window.clearInterval(timer)
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
            <Sparkles className="h-4 w-4 animate-pulse text-orange-400" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-100">AI 正在通读你的剧本</p>
            <p className="text-[11px] text-zinc-500">
              {label ?? "通读全本后推荐集数 / 单集时长 / 三幕结构 / 题材 / 视觉风格 / 服化道"}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {STEPS.map((step, index) => {
            const done = index < visibleStep
            const current = index === visibleStep
            return (
              <div key={step} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    done
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                      : current
                        ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
                        : "border-zinc-700 text-zinc-600",
                  )}
                >
                  {done ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : current ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    done ? "text-zinc-400" : current ? "text-zinc-200" : "text-zinc-600",
                  )}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-5 space-y-1.5">
          <Progress value={progress} />
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>请稍候，通常需要 10-30 秒</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
