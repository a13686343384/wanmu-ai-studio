"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { FileAudio, ImageIcon, Loader2, Upload, Video } from "lucide-react"
import { toast } from "sonner"
import { useReactFlow } from "@xyflow/react"
import { uploadStudioMedia } from "./upload"
import { useStudio } from "./types"
export function StudioAssets() {
  const { projectId, beforeChange } = useStudio()
  const { getNodes, setNodes, updateNodeData, screenToFlowPosition } =
    useReactFlow()
  const [files, setFiles] = useState<
    { id: string; name: string; mimeType: string; url: string }[]
  >([])
  const [workspace, setWorkspace] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
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
  useEffect(() => {
    void reload()
  }, [reload])
  function insertAsset(file: { name: string; mimeType: string; url: string }) {
    const kind = file.mimeType.startsWith("video")
      ? "video"
      : file.mimeType.startsWith("audio")
        ? "audio"
        : "image"
    const target = getNodes().find(
      (node) => node.selected && node.type === kind,
    )
    beforeChange()
    if (target)
      updateNodeData(target.id, { url: file.url, fileName: file.name })
    else {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
      })
      setNodes((nodes) => [
        ...nodes,
        {
          id: crypto.randomUUID(),
          type: kind,
          position,
          data: { kind, label: file.name, url: file.url, fileName: file.name },
        },
      ])
    }
    toast.success(target ? "素材已填入选中节点" : "素材已添加到画布")
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <p className="truncate text-xs text-zinc-500">{workspace} · 素材库</p>
      <input
        aria-label="搜索素材"
        placeholder="搜索素材名称"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs"
      />
      <button
        onClick={() => input.current?.click()}
        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 p-2 text-xs text-zinc-300"
      >
        <Upload className="h-3 w-3" />
        上传素材
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file)
            void uploadStudioMedia(projectId, file)
              .then(() => reload())
              .catch((err) => toast.error(err.message))
        }}
      />
      <p className="text-[10px] leading-5 text-zinc-600">
        点击素材填入选中的同类节点，或添加新节点。当前显示最近100个上传文件。
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-zinc-500" />
        ) : error ? (
          <button
            onClick={() => void reload()}
            className="text-xs text-orange-400"
          >
            {error}，点击重试
          </button>
        ) : files.filter((file) => file.name.includes(query)).length ? (
          files
            .filter((file) => file.name.includes(query))
            .map((file) => (
              <button
                key={file.id}
                onClick={() => insertAsset(file)}
                className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-left text-xs text-zinc-300"
              >
                {file.mimeType.startsWith("image") ? (
                  <ImageIcon className="h-4 w-4 shrink-0" />
                ) : file.mimeType.startsWith("video") ? (
                  <Video className="h-4 w-4 shrink-0" />
                ) : (
                  <FileAudio className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{file.name}</span>
              </button>
            ))
        ) : (
          <p className="py-6 text-center text-xs text-zinc-600">
            {query ? "没有匹配的素材" : "还没有上传素材"}
          </p>
        )}
      </div>
    </div>
  )
}
