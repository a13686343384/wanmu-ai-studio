"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 内联底部 loading 条（原型图3/4）。
 * 嵌入在 INTAKE 表单底部，表单仍可见；显示实时计时 + 取消按钮。
 */
export function AnalysisLoading({
  active,
  label,
  onCancel,
}: {
  active: boolean
  label?: string | null
  onCancel?: () => void
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return
    }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!active) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/[0.06] px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-300">
          {label ?? "正在等待 AI 分析结果…"}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-500">
          已用{" "}
          <span className="tabular-nums text-orange-400">{elapsed}s</span>
          {" · 吃全本 + 推理通常 1-3 分钟，请保持弹窗打开"}
        </p>
      </div>
      {onCancel && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-[10px] text-zinc-400 hover:text-zinc-200"
          onClick={onCancel}
        >
          取消
        </Button>
      )}
    </div>
  )
}
