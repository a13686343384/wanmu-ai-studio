"use client"

import { Check, ChevronDown, Coins, Sparkles } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { modelsForMediaType, useWorkbenchStore } from "@/stores/useWorkbenchStore"

/**
 * 模型选择下拉。
 * 每个选项展示：模型名 + 内置标签 + 积分消耗 + 选中态，
 * 与设计稿（全能图片 / Seedream / Man Image 系列）一致。
 */
export function ModelSelector() {
  const mediaType = useWorkbenchStore((s) => s.mediaType)
  const modelId = useWorkbenchStore((s) => s.modelId)
  const setModel = useWorkbenchStore((s) => s.setModel)

  const models = modelsForMediaType(mediaType)
  const current = models.find((m) => m.id === modelId) ?? models[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[240px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-400" />
          <span className="truncate">{current?.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onSelect={() => setModel(model.id)}
            className={cn(
              "flex-col items-start gap-1 py-2",
              model.id === modelId && "bg-zinc-800",
            )}
          >
            <span className="flex w-full items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-800">
                <Sparkles className="h-3 w-3 text-zinc-300" />
              </span>
              <span className="flex-1 truncate text-sm text-zinc-100">{model.name}</span>
              {model.builtIn && (
                <span className="rounded border border-zinc-700 px-1 text-[10px] text-zinc-500">
                  内置
                </span>
              )}
              {model.id === modelId && <Check className="h-3.5 w-3.5 text-orange-400" />}
            </span>
            <span className="flex items-center gap-1 pl-7 text-[11px] text-zinc-500">
              <Coins className="h-3 w-3 text-amber-400" />
              {model.cost} 起 · {model.note}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
