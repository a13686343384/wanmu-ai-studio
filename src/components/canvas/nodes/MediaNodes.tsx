"use client"

import { useRef } from "react"
import type { NodeProps } from "@xyflow/react"
import { Film, Upload } from "lucide-react"
import { NodeShell } from "./NodeShell"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"

/** 视频节点：支持本地选择，展示封面与时长。 */
export function VideoNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <NodeShell data={nodeData} selected={selected} icon={<Film className="h-3 w-3" />}>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          updateNodeData(id, { url: URL.createObjectURL(file), status: "done" })
          event.target.value = ""
        }}
      />

      {nodeData.url ? (
        <div className="space-y-1.5">
          <video
            src={nodeData.url}
            controls
            className="w-full rounded-md border border-zinc-800"
          />
          {typeof nodeData.duration === "string" && (
            <p className="text-[11px] text-zinc-500">{nodeData.duration}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-orange-500/60 hover:text-orange-400"
        >
          <Upload className="h-4 w-4" />
          <span className="text-[11px]">上传视频</span>
        </button>
      )}
    </NodeShell>
  )
}

/** 音频节点：波形占位 + 原生播放器。 */
export function AudioNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <NodeShell
      data={nodeData}
      selected={selected}
      icon={<span className="text-[10px]">♪</span>}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          updateNodeData(id, { url: URL.createObjectURL(file), status: "done" })
          event.target.value = ""
        }}
      />

      {nodeData.url ? (
        <div className="space-y-2">
          <div className="flex h-10 items-end gap-0.5">
            {Array.from({ length: 32 }).map((_, index) => (
              <span
                key={index}
                className="w-1 rounded-sm bg-violet-500/70"
                style={{ height: `${20 + ((index * 37) % 80)}%` }}
              />
            ))}
          </div>
          <audio src={nodeData.url} controls className="w-full" />
          {nodeData.duration && (
            <p className="text-[11px] text-zinc-500">{nodeData.duration}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-16 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-orange-500/60 hover:text-orange-400"
        >
          <span className="text-[11px]">上传音频 / 生成配音</span>
        </button>
      )}
    </NodeShell>
  )
}
