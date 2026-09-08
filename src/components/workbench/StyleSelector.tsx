"use client"

import { Check, Wand2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"

const STYLE_PRESETS = [
  { id: "cinematic", label: "电影感", hint: "高对比、浅景深、胶片颗粒" },
  { id: "realistic", label: "写实摄影", hint: "真实光照与材质" },
  { id: "anime", label: "日系动漫", hint: "赛璐璐上色、干净线条" },
  { id: "cyberpunk", label: "赛博朋克", hint: "霓虹、雨夜、高饱和" },
  { id: "ink", label: "水墨国风", hint: "留白、笔触、宣纸质感" },
  { id: "3d", label: "3D 渲染", hint: "体积光、次表面散射" },
  { id: "retro", label: "复古胶片", hint: "褪色、颗粒、暖调" },
] as const

/** 风格选择器：魔法棒按钮 + 预设风格列表。 */
export function StyleSelector() {
  const style = useWorkbenchStore((s) => s.style)
  const setStyle = useWorkbenchStore((s) => s.setStyle)
  const current = STYLE_PRESETS.find((s) => s.id === style)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
            current
              ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
              : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100",
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          {current?.label ?? "风格"}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-1">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setStyle(style === preset.id ? null : preset.id)}
            className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-800"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-zinc-200">{preset.label}</span>
              <span className="block text-[10px] text-zinc-500">{preset.hint}</span>
            </span>
            {style === preset.id && <Check className="mt-0.5 h-3.5 w-3.5 text-orange-400" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
