"use client"

import { Badge } from "@/components/ui/badge"

const STATS = [
  { key: "inProduction", label: "在产", color: "text-amber-400" },
  { key: "ready", label: "就绪", color: "text-sky-400" },
  { key: "completed", label: "已完成", color: "text-emerald-400" },
  { key: "total", label: "总计", color: "text-zinc-200" },
] as const

/**
 * 影视工厂头部：产品线说明 + 状态统计。
 */
export function FactoryHeader({
  counts,
}: {
  counts: { inProduction: number; ready: number; completed: number; total: number }
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
            Cinema Floor
          </span>
          <Badge variant="brand" className="font-normal">
            影视制片
          </Badge>
        </div>

        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">影视工厂</h1>
        <p className="mt-1 text-xs text-zinc-500">
          专业影视创作全流程 · 建档（会诊 + 台词润色）→ 大纲 → 资产 → 分镜 → 成片
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STATS.map((stat) => (
          <div
            key={stat.key}
            className="min-w-[64px] rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center"
          >
            <p className="text-[10px] text-zinc-500">{stat.label}</p>
            <p className={`mt-0.5 text-lg font-semibold tabular-nums ${stat.color}`}>
              {counts[stat.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
