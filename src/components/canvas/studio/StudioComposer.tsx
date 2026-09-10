"use client"
import { useState } from "react"
import { ArrowUp, Loader2 } from "lucide-react"
import { useNodesData, useReactFlow } from "@xyflow/react"
import {
  ASPECT_RATIOS,
  AUDIO_MODELS,
  DURATIONS,
  IMAGE_MODELS,
  RESOLUTIONS,
  TEXT_MODELS,
  VIDEO_MODELS,
} from "@/lib/constants"
import { Progress } from "@/components/ui/progress"
import { CardSelect } from "@/components/ui/card-select"
import { useStudio, type StudioNodeData, type StudioNodeKind } from "./types"

import { useStudioRequest } from "./useStudioRequest"

const MODELS = {
  text: TEXT_MODELS,
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  audio: AUDIO_MODELS,
}
export function StudioComposer({
  nodeId,
  kind,
}: {
  nodeId: string
  kind: StudioNodeKind
  prompt?: string
  modelId?: string
}) {
  const mediaType =
    kind === "director" || kind === "action" || kind === "sticky"
      ? "text"
      : kind
  const { getNodes, getEdges, updateNodeData, getNode } = useReactFlow()
  const { beforeChange } = useStudio()
  const data = useNodesData(nodeId)?.data as StudioNodeData | undefined
  const [progress, setProgress] = useState(0)
  const request = useStudioRequest(nodeId)
  if (!data) return null
  const draft = data.prompt ?? ""
  const model = data.modelId ?? MODELS[mediaType][0]!.id
  const current =
    MODELS[mediaType].find((item) => item.id === model) ?? MODELS[mediaType][0]!
  const running = request.running
  const params = {
    aspectRatio: String(data.aspectRatio ?? "16:9"),
    resolution: String(
      data.resolution ?? (mediaType === "image" ? "1K" : "480p"),
    ),
    duration: String(data.duration ?? (mediaType === "audio" ? "15s" : "5s")),
    smartLyrics: data.smartLyrics !== false,
  }
  async function send() {
    if (!draft.trim() || !getNode(nodeId)) return
    const token = request.begin()
    if (!token) return
    const sourceIds = getEdges()
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source)
    const inputs = getNodes().filter((node) => sourceIds.includes(node.id))
    const text = inputs
      .map((node) => node.data.text)
      .filter(Boolean)
      .join("\n")
      .slice(0, 1000)
    beforeChange()
    setProgress(10)
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(90, value + 10)),
      500,
    )
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType,
          prompt: (text
            ? `参考文本：${text}\n创作要求：${draft}`
            : draft
          ).slice(0, 2000),
          modelId: model,
          ...params,
          count: 1,
          references: inputs
            .filter((node) =>
              ["image", "video", "audio"].includes(String(node.type)),
            )
            .slice(0, 12)
            .map((node) => ({
              name: String(node.data.label),
              kind: node.type,
            })),
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      if (getNode(nodeId))
        updateNodeData(nodeId, {
          ...(mediaType === "text"
            ? { text: payload.data.text }
            : { url: payload.data.url }),
        })
      window.dispatchEvent(new CustomEvent("studio:generated"))
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("studio:error", {
          detail: error instanceof Error ? error.message : "生成失败",
        }),
      )
    } finally {
      request.end(token)
      window.clearInterval(timer)
      setProgress(100)
    }
  }
  const selectClass =
    "max-w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-[11px] text-zinc-300"
  return (
    <div className="nodrag nowheel mt-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl">
      <textarea
        aria-label="节点生成提示词"
        rows={3}
        value={draft}
        maxLength={2000}
        disabled={running}
        onFocus={beforeChange}
        onChange={(e) => updateNodeData(nodeId, { prompt: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void send()
          }
        }}
        placeholder="描述要生成的内容，连入的文本节点会作为上下文"
        className="w-full resize-none bg-transparent text-xs leading-6 text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      <div className="flex flex-wrap items-center gap-2">
        <CardSelect
          ariaLabel="节点模型"
          value={model}
          disabled={running}
          onValueChange={(value) => updateNodeData(nodeId, { modelId: value })}
          options={MODELS[mediaType].map((item) => ({ value: item.id, label: item.name }))}
        />
        {(mediaType === "image" || mediaType === "video") && (
          <>
            <CardSelect
              ariaLabel="节点画幅"
              value={params.aspectRatio}
              disabled={running}
              onValueChange={(value) => updateNodeData(nodeId, { aspectRatio: value })}
              options={ASPECT_RATIOS.map((item) => item.value)}
            />
            <CardSelect
              ariaLabel="节点分辨率"
              value={params.resolution}
              disabled={running}
              onValueChange={(value) => updateNodeData(nodeId, { resolution: value })}
              options={RESOLUTIONS.filter((item) =>
                mediaType === "image" ? item.includes("K") : item.includes("p"),
              )}
            />
          </>
        )}
        {(mediaType === "video" || mediaType === "audio") && (
          <CardSelect
            ariaLabel="节点时长"
            value={params.duration}
            disabled={running}
            onValueChange={(value) => updateNodeData(nodeId, { duration: value })}
            options={[...DURATIONS]}
          />
        )}
        {mediaType === "audio" && (
          <CardSelect
            ariaLabel="音频模式"
            value={params.smartLyrics ? "lyrics" : "music"}
            disabled={running}
            onValueChange={(value) =>
              updateNodeData(nodeId, { smartLyrics: value === "lyrics" })
            }
            options={[
              { value: "lyrics", label: "智能歌词" },
              { value: "music", label: "纯音乐" },
            ]}
          />
        )}
        <span className="ml-auto text-xs text-orange-300">
          {current.cost} 积分
        </span>
        <button
          type="button"
          aria-label="生成"
          data-testid="studio-composer-send"
          onClick={() => void send()}
          disabled={running || !draft.trim()}
          className="flex h-7 w-8 items-center justify-center rounded-md bg-orange-500 text-white disabled:opacity-40"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
      {running && (
        <Progress
          value={progress}
          className="mt-2 h-1"
          indicatorClassName="bg-orange-500"
        />
      )}
    </div>
  )
}
