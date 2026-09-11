"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, FileAudio, Folder, ImageIcon, Loader2, Plus, Search, Star, Upload, User, Video } from "lucide-react"
import { toast } from "sonner"
import { useReactFlow } from "@xyflow/react"
import { uploadStudioMedia } from "./upload"
import { useStudio } from "./types"
import { cn } from "@/lib/utils"

const FOLDERS = [
  { id: "favorites", label: "收藏", icon: Star },
  { id: "uncategorized", label: "未分类", icon: Folder },
  { id: "characters", label: "角色", icon: User },
  { id: "scenes", label: "场景", icon: ImageIcon },
  { id: "props", label: "道具", icon: Folder },
  { id: "styles", label: "风格", icon: ImageIcon },
  { id: "music", label: "音乐", icon: FileAudio },
  { id: "other", label: "其他", icon: Folder },
] as const

export function StudioAssets() {
  const { projectId, beforeChange } = useStudio()
  const { getNodes, setNodes, updateNodeData, screenToFlowPosition } = useReactFlow()
  const [files, setFiles] = useState<{ id: string; name: string; mimeType: string; url: string }[]>([])
  const [workspace, setWorkspace] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [scope, setScope] = useState<"personal" | "team">("personal")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["uncategorized"]))
  const input = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/media?projectId=${projectId}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载失败")
      setFiles(payload.data.files)
      setWorkspace(payload.data.workspace.name)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void reload() }, [reload])

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function insertAsset(file: { name: string; mimeType: string; url: string }) {
    const kind = file.mimeType.startsWith("video") ? "video" : file.mimeType.startsWith("audio") ? "audio" : "image"
    const target = getNodes().find(node => node.selected && node.type === kind)
    beforeChange()
    if (target) updateNodeData(target.id, { url: file.url, fileName: file.name })
    else {
      const position = screenToFlowPosition({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 })
      setNodes(nodes => [...nodes, { id: crypto.randomUUID(), type: kind, position, data: { kind, label: file.name, url: file.url, fileName: file.name } }])
    }
    toast.success(target ? "素材已填入选中节点" : "素材已添加到画布")
  }

  const filtered = files.filter(f => f.name.includes(query))
  // 简单分组：图片→角色/场景/风格，视频→场景，音频→音乐，其余→未分类
  const grouped: Record<string, typeof files> = {}
  for (const f of filtered) {
    let folder = "uncategorized"
    if (f.mimeType.startsWith("image")) folder = "characters"
    else if (f.mimeType.startsWith("audio")) folder = "music"
    if (!grouped[folder]) grouped[folder] = []
    grouped[folder].push(f)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      {/* 顶部按钮 */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-600">
          <User className="h-3 w-3" />AI 角色
        </button>
        <button onClick={() => input.current?.click()} className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:border-zinc-600">
          <Plus className="h-3 w-3" />
        </button>
        <span className="ml-auto truncate text-[10px] text-zinc-600">{workspace}</span>
      </div>

      {/* 个人/团队切换 */}
      <div className="flex rounded-md border border-zinc-800 p-0.5">
        {(["personal", "team"] as const).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className={cn("flex-1 rounded px-2 py-1 text-[10px] transition-colors",
              scope === s ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
            {s === "personal" ? "个人" : "团队"}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
        <input aria-label="搜索素材" placeholder="搜索素材名称" value={query} onChange={e => setQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-1.5 pl-7 pr-2 text-[10px] text-zinc-300 outline-none placeholder:text-zinc-600" />
      </div>

      {/* 上传 */}
      <input ref={input} type="file" accept="image/*,video/*,audio/*" className="hidden"
        onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void uploadStudioMedia(projectId, file).then(() => reload()).catch(err => toast.error(err.message)) }} />

      {/* 文件夹树 */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-zinc-500" />
        ) : error ? (
          <button onClick={() => void reload()} className="text-xs text-orange-400">{error}，点击重试</button>
        ) : (
          <>
            {/* 项目文件夹 */}
            <FolderItem label={workspace || "本项目"} count={filtered.length} expanded={expandedFolders.has("__project__")}
              onToggle={() => toggleFolder("__project__")} icon={Folder}>
              {filtered.slice(0, 20).map(file => (
                <button key={file.id} onClick={() => insertAsset(file)}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[10px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
                  {file.mimeType.startsWith("image") ? <ImageIcon className="h-3 w-3 shrink-0" /> :
                    file.mimeType.startsWith("video") ? <Video className="h-3 w-3 shrink-0" /> :
                      <FileAudio className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-2 py-2 text-[10px] text-zinc-600">暂无素材</p>}
            </FolderItem>

            {/* 分类文件夹 */}
            {FOLDERS.map(folder => {
              const Icon = folder.icon
              const items = grouped[folder.id] ?? []
              return (
                <FolderItem key={folder.id} label={folder.label} count={items.length}
                  expanded={expandedFolders.has(folder.id)} onToggle={() => toggleFolder(folder.id)} icon={Icon}>
                  {items.length === 0 ? (
                    <p className="px-2 py-1 text-[10px] text-zinc-600">空</p>
                  ) : items.map(file => (
                    <button key={file.id} onClick={() => insertAsset(file)}
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[10px] text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200">
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))}
                </FolderItem>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

function FolderItem({ label, count, expanded, onToggle, icon: Icon, children }: {
  label: string; count: number; expanded: boolean; onToggle: () => void; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[10px] text-zinc-400 hover:bg-zinc-800/50">
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Icon className="h-3 w-3 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {count > 0 && <span className="text-zinc-600">{count}</span>}
      </button>
      {expanded && <div className="ml-4 space-y-0.5">{children}</div>}
    </div>
  )
}
