"use client"

import type { ReactNode } from "react"
import { Handle, Position } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { CanvasNodeData } from "@/stores/useCanvasStore"

const STATUS_DOT: Record<string, string> = {
  idle: "bg-zinc-600",
  running: "bg-amber-400 animate-pulse",
  done: "bg-emerald-400",
  error: "bg-rose-500",
}

/**
 * 画布节点通用外壳：统一边框、标题栏、状态点与连接桩。
 * 各具体节点只需提供标题图标与内容区。
 */
export function NodeShell({
  data,
  selected,
  icon,
  width = 260,
  children,
  target = true,
  source = true,
  accent,
}: {
  data: CanvasNodeData
  selected?: boolean
  icon: ReactNode
  width?: number
  children: ReactNode
  target?: boolean
  source?: boolean
  accent?: string
}) {
  return (
    <div
      style={{ width }}
      className={cn(
        "overflow-hidden rounded-xl border bg-zinc-900/95 shadow-lg backdrop-blur transition-colors",
        selected ? "border-orange-500/70 ring-1 ring-orange-500/30" : "border-zinc-800",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-zinc-800 px-3 py-2",
          accent ?? "bg-zinc-950/60",
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-300">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200">
          {data.label}
        </span>
        <span
          className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[data.status ?? "idle"])}
          title={data.status ?? "idle"}
        />
      </div>

      <div className="p-3">{children}</div>

      {target && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-zinc-900 !bg-zinc-500"
        />
      )}
      {source && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-zinc-900 !bg-orange-500"
        />
      )}
    </div>
  )
}
