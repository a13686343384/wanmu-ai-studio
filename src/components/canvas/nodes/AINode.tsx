"use client"

import type { NodeProps } from "@xyflow/react"
import { Loader2, Sparkles, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RequestPending } from "@/components/shared/RequestPending"
import { NodeShell } from "./NodeShell"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"
import { useAiModels } from "@/hooks/useAiModels"

/**
 * AI 生成节点：选择模型、输入提示词与反向提示词，直接调用生成接口。
 * 生成结果写回节点 data.url，供下游图片/视频节点消费。
 */
export function AINode({ id, data, selected }: NodeProps) {
  const nodeData = data as CanvasNodeData
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const { models: imageModels } = useAiModels("image")

  async function run() {
    if (nodeData.status === "running") return
    const prompt = (nodeData.prompt ?? "").trim()
    if (!prompt) {
      toast.error("请先填写提示词")
      return
    }

    updateNodeData(id, { status: "running", progress: 0 })

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "image",
          prompt,
          modelId: nodeData.model ?? "all-in-one",
          aspectRatio: nodeData.aspectRatio ?? "16:9",
          resolution: nodeData.resolution ?? "1K",
          duration: nodeData.duration ?? "5s",
          count: 1,
          references: [],
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      if (!payload.data?.url) throw new Error("生成服务未返回有效资源")
      updateNodeData(id, {
        status: "done",
        progress: 100,
        url: payload.data.url,
      })
      toast.success("AI 生成完成")
    } catch (error) {
      updateNodeData(id, { status: "error", progress: 0 })
      toast.error(error instanceof Error ? error.message : "生成失败")
    }
  }

  return (
    <NodeShell
      data={nodeData}
      selected={selected}
      width={300}
      icon={<Sparkles className="h-3 w-3 text-orange-400" />}
      accent="bg-orange-500/10"
    >
      <div className="space-y-2">
        <select
          value={nodeData.model ?? "all-in-one"}
          onChange={(event) =>
            updateNodeData(id, { model: event.target.value })
          }
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-500/60"
        >
          {imageModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} · {model.cost} 积分
            </option>
          ))}
        </select>

        <textarea
          value={nodeData.prompt ?? ""}
          onChange={(event) =>
            updateNodeData(id, { prompt: event.target.value })
          }
          rows={3}
          placeholder="描述你想要的画面…"
          className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
        />

        <input
          value={nodeData.negativePrompt ?? ""}
          onChange={(event) =>
            updateNodeData(id, { negativePrompt: event.target.value })
          }
          placeholder="反向提示词（可选）"
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
        />

        {nodeData.status === "running" && <RequestPending />}

        {nodeData.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={nodeData.url}
            alt={nodeData.prompt ?? ""}
            loading="lazy"
            decoding="async"
            className="w-full rounded-md border border-zinc-800 object-cover"
          />
        )}

        <Button
          variant="brand"
          size="sm"
          className="w-full"
          onClick={() => void run()}
          disabled={nodeData.status === "running"}
        >
          {nodeData.status === "running" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Zap />
          )}
          {nodeData.url ? "重新生成" : "生成"}
        </Button>
      </div>
    </NodeShell>
  )
}
