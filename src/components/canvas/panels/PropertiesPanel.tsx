"use client"

import { Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASPECT_RATIOS, RESOLUTIONS } from "@/lib/constants"
import { useCanvasStore, type CanvasNodeData } from "@/stores/useCanvasStore"
import { useAiModels } from "@/hooks/useAiModels"

const NODE_KIND_LABEL: Record<string, string> = {
  text: "文本节点",
  image: "图片节点",
  video: "视频节点",
  audio: "音频节点",
  ai: "AI 生成节点",
  script: "剧本节点",
  storyboard: "分镜节点",
}

/**
 * 属性面板：编辑当前选中节点的字段。
 * 字段随节点类型变化，未选中的节点不展示表单。
 */
export function PropertiesPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId)
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId))
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const duplicateNode = useCanvasStore((s) => s.duplicateNode)
  const { models: imageModels } = useAiModels("image")

  if (!node) {
    return (
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          属性
        </p>
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center text-[11px] leading-relaxed text-zinc-600">
          选中画布上的节点
          <br />
          即可在这里编辑属性
        </p>
      </div>
    )
  }

  const data = node.data as CanvasNodeData
  const kind = data.kind

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          属性 · {NODE_KIND_LABEL[kind] ?? kind}
        </p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => duplicateNode(node.id)}
            aria-label="复制节点"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeNode(node.id)}
            aria-label="删除节点"
            className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-zinc-400">名称</Label>
        <Input
          value={data.label}
          onChange={(event) => updateNodeData(node.id, { label: event.target.value })}
          className="h-8 text-xs"
        />
      </div>

      {(kind === "text" || kind === "script" || kind === "storyboard") && (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">内容</Label>
          <Textarea
            rows={5}
            value={data.text ?? ""}
            onChange={(event) => updateNodeData(node.id, { text: event.target.value })}
            className="text-xs"
          />
        </div>
      )}

      {(kind === "ai" || kind === "image" || kind === "video") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">模型</Label>
            <Select
              value={data.model ?? imageModels[0]?.id ?? ""}
              onValueChange={(value) => updateNodeData(node.id, { model: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">提示词</Label>
            <Textarea
              rows={4}
              value={data.prompt ?? ""}
              onChange={(event) => updateNodeData(node.id, { prompt: event.target.value })}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">反向提示词</Label>
            <Input
              value={data.negativePrompt ?? ""}
              onChange={(event) => updateNodeData(node.id, { negativePrompt: event.target.value })}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">画幅</Label>
              <Select
                value={data.aspectRatio ?? "16:9"}
                onValueChange={(value) => updateNodeData(node.id, { aspectRatio: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map((ratio) => (
                    <SelectItem key={ratio.value} value={ratio.value}>
                      {ratio.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">分辨率</Label>
              <Select
                value={data.resolution ?? "1K"}
                onValueChange={(value) => updateNodeData(node.id, { resolution: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((resolution) => (
                    <SelectItem key={resolution} value={resolution}>
                      {resolution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {data.url && (
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">资源地址</Label>
          <Input readOnly value={data.url.slice(0, 80)} className="h-8 text-[10px]" />
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
        <p className="text-[10px] leading-relaxed text-zinc-500">
          节点 ID：<span className="font-mono">{node.id}</span>
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
          位置：{Math.round(node.position.x)}, {Math.round(node.position.y)}
        </p>
      </div>
    </div>
  )
}
