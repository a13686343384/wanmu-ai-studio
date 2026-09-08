"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VIDEO_FEATURES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"

/**
 * 视频生成能力选择（仅视频模式展示）。
 * 选项来自设计稿：全能参考生视频 / 首尾帧生视频。
 */
export function FeatureSelector() {
  const videoFeature = useWorkbenchStore((s) => s.videoFeature)
  const setVideoFeature = useWorkbenchStore((s) => s.setVideoFeature)
  const mediaType = useWorkbenchStore((s) => s.mediaType)

  if (mediaType !== "video") return null

  const current = VIDEO_FEATURES.find((f) => f.id === videoFeature) ?? VIDEO_FEATURES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[220px] items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <span className="truncate">{current.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {VIDEO_FEATURES.map((feature) => (
          <DropdownMenuItem
            key={feature.id}
            onSelect={() => setVideoFeature(feature.id)}
            className={cn("flex-col items-start gap-0.5 py-2", videoFeature === feature.id && "bg-zinc-800")}
          >
            <span className="text-sm text-zinc-100">{feature.name}</span>
            <span className="text-[11px] text-zinc-500">{feature.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
