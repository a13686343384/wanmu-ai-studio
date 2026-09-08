"use client"

import {
  Clapperboard,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Sparkles,
  Type,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCanvasStore, type CanvasNodeKind } from "@/stores/useCanvasStore"

const NODE_LIBRARY: {
  kind: CanvasNodeKind
  label: string
  description: string
  icon: typeof Type
  accent: string
}[] = [
  { kind: "text", label: "文本", description: "输入提示词或说明", icon: Type, accent: "text-zinc-300" },
  { kind: "image", label: "图片", description: "上传或引用图片", icon: ImageIcon, accent: "text-emerald-400" },
  { kind: "video", label: "视频", description: "上传或引用视频", icon: Film, accent: "text-rose-400" },
  { kind: "audio", label: "音频", description: "配音 / BGM", icon: Music, accent: "text-violet-400" },
  { kind: "ai", label: "AI 生成", description: "调用模型生成素材", icon: Sparkles, accent: "text-orange-400" },
  { kind: "script", label: "剧本", description: "引用剧本片段", icon: FileText, accent: "text-sky-400" },
  { kind: "storyboard", label: "分镜", description: "引用分镜与分镜图", icon: Clapperboard, accent: "text-cyan-400" },
]

/** 节点库面板：点击即可在画布中新增对应节点。 */
export function NodePanel() {
  const addNode = useCanvasStore((s) => s.addNode)

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        节点库
      </p>
      <div className="space-y-1">
        {NODE_LIBRARY.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => addNode(item.kind)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/wanmusheng-node", item.kind)
                event.dataTransfer.effectAllowed = "move"
              }}
              className="flex w-full items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950">
                <Icon className={cn("h-3.5 w-3.5", item.accent)} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-zinc-200">{item.label}</span>
                <span className="block truncate text-[10px] text-zinc-500">
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
