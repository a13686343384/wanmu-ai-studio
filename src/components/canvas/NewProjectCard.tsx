"use client"

import { Plus } from "lucide-react"

/**
 * 「新建项目」占位卡片（虚线边框 + 大号加号），与设计稿一致。
 */
export function NewProjectCard({
  onClick,
  view = "grid",
}: {
  onClick: () => void
  view?: "grid" | "list"
}) {
  if (view === "list") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/20 p-2.5 text-left transition-colors hover:border-orange-500/60 hover:bg-zinc-900/40"
      >
        <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-700">
          <Plus className="h-4 w-4 text-zinc-500" />
        </span>
        <span className="text-sm text-zinc-400">新建项目</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-600 hover:bg-zinc-900/70"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-900 shadow-md transition-transform group-hover:scale-105">
        <Plus className="h-5 w-5" />
      </span>
      <span className="text-sm text-zinc-300">新建项目</span>
    </button>
  )
}
