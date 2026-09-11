"use client"

import { RequestPending } from "@/components/shared/RequestPending"

/** Only confirmed request stages are displayed; AI internal steps are unknown. */
export function AnalysisLoading({
  active,
  label,
}: {
  active: boolean
  label?: string | null
}) {
  if (!active) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-medium text-zinc-100">剧本分析</h2>
        <RequestPending label={label ?? "正在等待 AI 分析结果…"} />
        <p className="mt-4 text-xs text-zinc-500">
          服务尚未返回具体进度，请保持页面打开。完成后会显示分析结果。
        </p>
      </div>
    </div>
  )
}
