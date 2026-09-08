"use client"

import { AudioLines, Image as ImageIcon, Video } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MEDIA_TYPES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useWorkbenchStore, type MediaType } from "@/stores/useWorkbenchStore"

const ICONS = { video: Video, image: ImageIcon, audio: AudioLines } as const

/**
 * 媒体类型切换（视频 / 图片 / 音频）。
 * 当前类型以品牌红/橙色高亮，与设计稿一致。
 */
export function MediaTypeSelector() {
  const mediaType = useWorkbenchStore((s) => s.mediaType)
  const setMediaType = useWorkbenchStore((s) => s.setMediaType)

  const current = MEDIA_TYPES.find((m) => m.value === mediaType) ?? MEDIA_TYPES[0]
  const Icon = ICONS[mediaType]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/15"
        >
          <Icon className="h-3.5 w-3.5" />
          {current.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        {MEDIA_TYPES.map((type) => {
          const TypeIcon = ICONS[type.value as MediaType]
          return (
            <DropdownMenuItem
              key={type.value}
              onSelect={() => setMediaType(type.value as MediaType)}
              className={cn(mediaType === type.value && "bg-zinc-800")}
            >
              <TypeIcon className="h-4 w-4" />
              {type.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
