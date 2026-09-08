"use client"

import type { NodeProps } from "@xyflow/react"
import { Clapperboard, FileText } from "lucide-react"
import { NodeShell } from "./NodeShell"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"

/** 剧本节点：展示剧本片段，可就地编辑。 */
export function ScriptNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  return (
    <NodeShell
      data={nodeData}
      selected={selected}
      width={280}
      icon={<FileText className="h-3 w-3 text-sky-400" />}
      accent="bg-sky-500/10"
    >
      <textarea
        value={nodeData.text ?? ""}
        onChange={(event) => updateNodeData(id, { text: event.target.value })}
        rows={5}
        placeholder="粘贴剧本片段…"
        className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-sky-500/60"
      />
    </NodeShell>
  )
}

/** 分镜节点：展示镜号、镜头类型与描述。 */
export function StoryboardNode({ data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData

  return (
    <NodeShell
      data={nodeData}
      selected={selected}
      width={280}
      icon={<Clapperboard className="h-3 w-3 text-cyan-400" />}
      accent="bg-cyan-500/10"
    >
      <div className="space-y-2">
        {nodeData.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nodeData.url}
            alt={nodeData.label}
            loading="lazy"
            decoding="async"
            className="w-full rounded-md border border-zinc-800 object-cover"
          />
        ) : (
          <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-zinc-700 text-[11px] text-zinc-600">
            尚无分镜图
          </div>
        )}
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
          {nodeData.text || "尚未导入分镜内容"}
        </p>
      </div>
    </NodeShell>
  )
}
