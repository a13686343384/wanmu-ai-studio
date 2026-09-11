"use client"
import { currentModelScope } from "@/lib/ai/client-scope"
import { ArrowUp, Camera, Loader2, Mic, Shield, Sparkles, Wand2 } from "lucide-react"
import { useNodesData, useReactFlow } from "@xyflow/react"
import { ASPECT_RATIOS, DURATIONS, RESOLUTIONS } from "@/lib/constants"
import { useAiModels } from "@/hooks/useAiModels"
import { RequestPending } from "@/components/shared/RequestPending"
import { CardSelect } from "@/components/ui/card-select"
import { useStudio, type StudioNodeData, type StudioNodeKind } from "./types"

import { useStudioRequest } from "./useStudioRequest"

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
  const { models: textModels } = useAiModels("text")
  const { models: imageModels } = useAiModels("image")
  const { models: videoModels } = useAiModels("video")
  const { models: audioModels } = useAiModels("audio")
  const MODELS = {
    text: textModels,
    image: imageModels,
    video: videoModels,
    audio: audioModels,
  }
  const { getNodes, getEdges, updateNodeData, getNode } = useReactFlow()
  const { beforeChange } = useStudio()
  const data = useNodesData(nodeId)?.data as StudioNodeData | undefined
  const request = useStudioRequest(nodeId)
  if (!data) return null
  const draft = data.prompt ?? ""
  const model = data.modelId ?? MODELS[mediaType][0]?.id ?? ""
  const current =
    MODELS[mediaType].find((item) => item.id === model)
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
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...currentModelScope(),
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
      if (mediaType === "text" ? !payload.data?.text : !payload.data?.url)
        throw new Error("生成服务未返回有效内容")
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
        className="w-full resize-none rounded-lg bg-zinc-950/80 px-2.5 py-2 text-xs leading-6 text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      <div className="flex flex-wrap items-center gap-2">
        <CardSelect
          ariaLabel="节点模型"
          value={model}
          disabled={running}
          onValueChange={(value) => updateNodeData(nodeId, { modelId: value })}
          options={[...(!current && model ? [{value:model,label:"已保存模型不可用，请重新选择"}] : []),...MODELS[mediaType].map((item) => ({
            value: item.id,
            label: item.name,
          }))]}
        />
        {(mediaType === "image" || mediaType === "video") && (
          <>
            <CardSelect
              ariaLabel="节点画幅"
              value={params.aspectRatio}
              disabled={running}
              onValueChange={(value) =>
                updateNodeData(nodeId, { aspectRatio: value })
              }
              options={ASPECT_RATIOS.map((item) => item.value)}
            />
            <CardSelect
              ariaLabel="节点分辨率"
              value={params.resolution}
              disabled={running}
              onValueChange={(value) =>
                updateNodeData(nodeId, { resolution: value })
              }
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
            onValueChange={(value) =>
              updateNodeData(nodeId, { duration: value })
            }
            options={[...DURATIONS]}
          />
        )}
        {/* 图片模式额外控制 */}
        {mediaType === "image" && (
          <>
            <button type="button" title="风格" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Wand2 className="h-3 w-3" />风格
            </button>
            <button type="button" title="安全区" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Shield className="h-3 w-3" />安全区
            </button>
            <button type="button" title="特效" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Sparkles className="h-3 w-3" />特效
            </button>
          </>
        )}
        {/* 视频模式额外控制 */}
        {mediaType === "video" && (
          <>
            <button type="button" title="运镜" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Camera className="h-3 w-3" />运镜
            </button>
            <button type="button" title="安全区" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Shield className="h-3 w-3" />安全区
            </button>
            <button type="button" title="特效" className="flex h-7 items-center gap-1 rounded-md border border-zinc-700 px-1.5 text-[10px] text-zinc-400 hover:border-zinc-600">
              <Sparkles className="h-3 w-3" />特效
            </button>
          </>
        )}
        {/* 音频三模式切换 */}
        {mediaType === "audio" && (
          <>
            <CardSelect
              ariaLabel="音频模式"
              value={params.smartLyrics ? "lyrics" : "music"}
              disabled={running}
              onValueChange={(value) =>
                updateNodeData(nodeId, { smartLyrics: value === "lyrics" })
              }
              options={[
                { value: "adaptive", label: "自适应" },
                { value: "lyrics", label: "自定义" },
                { value: "music", label: "纯音乐" },
              ]}
            />
            <button type="button" title="录音输入" className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 hover:border-zinc-600">
              <Mic className="h-3 w-3" />
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-orange-300">
          {current?.cost ?? 0} 积分
        </span>
        <button
          type="button"
          aria-label="生成"
          data-testid="studio-composer-send"
          onClick={() => void send()}
          disabled={running || !draft.trim() || !current}
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
        <div className="mt-2">
          <RequestPending startedAt={request.startedAt} />
        </div>
      )}
    </div>
  )
}
