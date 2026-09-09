"use client"

import { useEffect, useRef } from "react"
import {
  AudioLines,
  Image as ImageIcon,
  Layers,
  TextQuote,
  Upload,
  Video,
} from "lucide-react"
import type { StudioNodeKind } from "./types"

export interface ContextMenuItem {
  kind: StudioNodeKind | "upload"
  title: string
  description: string
}

const ITEMS: ContextMenuItem[] = [
  { kind: "text", title: "文本生成", description: "脚本、广告词、品牌文案" },
  { kind: "image", title: "图片生成", description: "宣传图、海报、封面" },
  { kind: "video", title: "视频生成", description: "宣传视频、动画、电影" },
  { kind: "audio", title: "音频", description: "配音、音效、背景音乐" },
  { kind: "director", title: "3D导演台", description: "搭建场景并多视角截图" },
  { kind: "action", title: "动作导演", description: "编排对打、群战、清兵与大招" },
  { kind: "upload", title: "上传", description: "本地图片、视频、音频" },
]

function ItemIcon({ kind }: { kind: ContextMenuItem["kind"] }) {
  const cls = "h-4 w-4 text-zinc-300"
  switch (kind) {
    case "text":
      return <TextQuote className={cls} />
    case "image":
      return <ImageIcon className={cls} />
    case "video":
      return <Video className={cls} />
    case "audio":
      return <AudioLines className={cls} />
    case "director":
      return <Layers className={cls} />
    case "action":
      return (
        // 交叉双剑：动作编排
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cls}>
          <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
          <path d="m13 19 6 3-4-3 3-4-3 4Z" />
          <path d="M16 16l5 5" />
          <path d="m9.5 17.5 3-3" />
        </svg>
      )
    case "upload":
      return <Upload className={cls} />
  }
}

/**
 * 画布空白处右键的「新建节点」菜单（与设计稿一致）。
 * fixed 定位 + 点击外部 / Esc 关闭；upload 项由父级通过隐藏 input 处理。
 */
export function StudioContextMenu({
  x,
  y,
  onSelect,
  onUpload,
  onClose,
}: {
  x: number
  y: number
  onSelect: (kind: StudioNodeKind) => void
  onUpload: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as globalThis.Node)) onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("mousedown", onPointerDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onPointerDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  // 视口内夹取，避免菜单出界
  const left = Math.min(x, window.innerWidth - 244)
  const top = Math.min(y, window.innerHeight - 470)

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="新建节点"
      className="fixed z-[120] w-[228px] rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
      style={{ left, top }}
    >
      <p className="mb-2 px-1 text-[11px] text-zinc-500">新建节点</p>

      <div className="space-y-0.5">
        {ITEMS.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="menuitem"
            onClick={() => {
              if (item.kind === "upload") onUpload()
              else onSelect(item.kind)
              onClose()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-zinc-800/80"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
              <ItemIcon kind={item.kind} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-zinc-100">{item.title}</span>
              <span className="block truncate text-[10px] text-zinc-500">{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
