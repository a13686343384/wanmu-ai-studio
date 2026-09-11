"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

/** Unknown provider progress: show wall-clock waiting time, never an estimated percentage. */
export function RequestPending({
  label = "正在等待生成结果",
  startedAt,
}: {
  label?: string
  startedAt?: number
}) {
  const [mountedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () =>
      setElapsed(
        Math.max(0, Math.floor((Date.now() - (startedAt ?? mountedAt)) / 1000)),
      )
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [mountedAt, startedAt])
  return (
    <div
      role="status"
      data-testid="request-pending"
      className="flex flex-wrap items-center gap-2 text-xs text-zinc-400"
    >
      <Loader2
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 animate-spin text-orange-400"
      />
      <span>{label}</span>
      <span className="tabular-nums text-zinc-500">已等待 {elapsed} 秒</span>
    </div>
  )
}
