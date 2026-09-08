"use client"

import { useRef } from "react"
import type { NodeProps } from "@xyflow/react"
import { ImageIcon, Upload } from "lucide-react"
import { NodeShell } from "./NodeShell"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"

/** 图片节点：支持本地选择或 URL 粘贴。 */
export function ImageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <NodeShell data={nodeData} selected={selected} icon={<ImageIcon className="h-3 w-3" />}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          updateNodeData(id, { url: URL.createObjectURL(file), status: "done" })
          event.target.value = ""
        }}
      />

      {nodeData.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={nodeData.url}
          alt={nodeData.label}
          className="w-full rounded-md border border-zinc-800 object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-orange-500/60 hover:text-orange-400"
        >
          <Upload className="h-4 w-4" />
          <span className="text-[11px]">上传图片</span>
        </button>
      )}

      {nodeData.url && (
        <button
          type="button"
          onClick={() => updateNodeData(id, { url: "", status: "idle" })}
          className="mt-2 w-full rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200"
        >
          移除图片
        </button>
      )}
    </NodeShell>
  )
}
