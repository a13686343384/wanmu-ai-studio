"use client"

import { useEffect, useRef, useState } from "react"
import type { NodeProps } from "@xyflow/react"
import { Type } from "lucide-react"
import { NodeShell } from "./NodeShell"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"

/** 文本节点：可就地编辑。 */
export function TextNode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nodeData.text ?? "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== nodeData.text) updateNodeData(id, { text: draft })
  }

  return (
    <NodeShell data={nodeData} selected={selected} icon={<Type className="h-3 w-3" />}>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Escape") commit()
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) commit()
          }}
          rows={4}
          className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs leading-relaxed text-zinc-100 outline-none focus:border-orange-500/60"
        />
      ) : (
        <p
          onClick={() => {
            setDraft(nodeData.text ?? "")
            setEditing(true)
          }}
          className="min-h-[3rem] cursor-text whitespace-pre-wrap rounded-md px-1 text-xs leading-relaxed text-zinc-300 hover:bg-zinc-800/40"
        >
          {nodeData.text || "点击编辑文本…"}
        </p>
      )}
    </NodeShell>
  )
}
