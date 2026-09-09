"use client"

import { useMemo, useState } from "react"
import {
  AudioLines,
  Box,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  PanelLeftClose,
  Search,
  Sparkles,
  Star,
  User,
  Video,
} from "lucide-react"
import { StudioAssets } from "./StudioAssets"
import { cn } from "@/lib/utils"
import type { Node } from "@xyflow/react"
import type { StudioNodeData } from "./types"

const KIND_ICON = {
  text: <span className="font-serif text-[10px]">T</span>,
  image: <ImageIcon className="h-3 w-3" />,
  video: <Video className="h-3 w-3" />,
  audio: <AudioLines className="h-3 w-3" />,
  director: <Layers className="h-3 w-3" />,
  action: <Box className="h-3 w-3" />,
  sticky: <span className="text-[10px]">🗒</span>,
} as const

const KIND_TAB: Record<string, string[]> = {
  全部: [],
  图片: ["image"],
  视频: ["video"],
  音频: ["audio"],
  文本: ["text", "sticky"],
}

const ASSET_FOLDERS = [
  { name: "收藏", icon: Star },
  { name: "未分类", icon: FolderOpen },
  { name: "角色", icon: User },
  { name: "场景", icon: Folder },
  { name: "道具", icon: Box },
  { name: "风格", icon: Sparkles },
  { name: "音乐", icon: AudioLines },
  { name: "其他", icon: Folder },
]

/**
 * 画布操作页左侧栏。
 * 画布 Tab：展示画布上的节点（随画布增删同步），点击定位到对应节点；
 * 资产 Tab：个人 / 团队资产库目录树。
 */
export function StudioSidebar({
  nodes,
  tab,
  onTabChange,
  onLocate,
  onCollapse,
}: {
  nodes: Node[]
  tab: "canvas" | "assets"
  onTabChange: (tab: "canvas" | "assets") => void
  onLocate: (nodeId: string) => void
  onCollapse: () => void
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>("全部")
  const [assetScope, setAssetScope] = useState<"personal" | "team">("personal")
  const [openFolders, setOpenFolders] = useState<string[]>(["未分类", "角色"])

  const items = useMemo(() => {
    return nodes
      .map((node) => {
        const data = node.data as StudioNodeData
        return {
          id: node.id,
          kind: data.kind,
          label: data.label,
          hint:
            data.kind === "text"
              ? "文本"
              : data.kind === "sticky"
                ? "文本"
                : data.kind === "action"
                  ? "动作导演"
                  : data.kind === "director"
                    ? "导演台"
                    : data.kind === "audio"
                      ? "音频"
                      : data.kind,
        }
      })
      .filter((item) => {
        const allowed = KIND_TAB[filter] ?? []
        if (allowed.length && !allowed.includes(item.kind)) return false
        if (query.trim() && !item.label.includes(query.trim())) return false
        return true
      })
      .reverse()
  }, [nodes, filter, query])

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="flex items-center gap-1 px-2.5 pt-2.5">
        <div className="flex flex-1 rounded-lg bg-zinc-900/70 p-0.5">
          {(
            [
              { key: "canvas", label: "画布" },
              { key: "assets", label: "资产" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onTabChange(item.key)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs transition-colors",
                tab === item.key
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {item.label}
              {item.key === "assets" && nodes.length > 0 && (
                <span className="ml-1 text-[10px] text-zinc-600">
                  {nodes.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="收起侧栏"
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {tab === "canvas" ? (
        <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称"
              className="h-7 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 pl-7 pr-2 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-700"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {Object.keys(KIND_TAB).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  filter === name
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-zinc-600">
                画布上还没有资源
                <br />
                从底部工具栏添加节点
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLocate(item.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-zinc-900"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-500">
                    {KIND_ICON[item.kind as keyof typeof KIND_ICON]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-zinc-300">
                      {item.label}
                    </span>
                    <span className="block truncate text-[10px] text-zinc-600">
                      {item.hint}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <StudioAssets />
      )}
    </aside>
  )
}
