"use client"
import { currentModelScope } from "@/lib/ai/client-scope"

import { useCallback } from "react"
import { Play } from "lucide-react"
import { toast } from "sonner"
import { RequestPending } from "@/components/shared/RequestPending"
import {
  ReferenceUpload,
  ReferenceThumbnails,
} from "@/components/workbench/ReferenceUpload"
import { PromptInput } from "@/components/workbench/PromptInput"
import { ParameterBar } from "@/components/workbench/ParameterBar"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"

/**
 * 工作台生成面板：参考素材 + 提示词 + 参数栏。
 * 负责调用 /api/ai/generate 并展示真实等待状态、展示结果。
 */
export function GenerationPanel() {
  const store = useWorkbenchStore()
  const {
    mediaType,
    prompt,
    modelId,
    references,
    aspectRatio,
    resolution,
    duration,
    count,
    style,
    smartLyrics,
  } = store

  const run = useCallback(async () => {
    if (store.isGenerating) return
    if (!prompt.trim()) {
      toast.error("请先描述你想要的内容")
      return
    }

    store.setGenerating(true, 0, "准备中…")

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...currentModelScope(),
          mediaType,
          prompt,
          modelId,
          aspectRatio,
          resolution,
          duration,
          count,
          style,
          smartLyrics,
          references: references.map((r) => ({ name: r.name, kind: r.kind })),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "生成失败")
      }

      if (!payload.data?.url) throw new Error("生成服务未返回有效资源")

      store.addResult({
        id: payload.data.id,
        url: payload.data.url,
        poster: payload.data.poster,
        mediaType,
        prompt,
        model: modelId,
        createdAt: new Date().toISOString(),
      })

      toast.success("生成完成", { description: "结果已加入下方作品区" })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "生成失败，请稍后重试",
      )
    } finally {
      store.setGenerating(false, 0, "")
    }
  }, [
    mediaType,
    prompt,
    modelId,
    references,
    aspectRatio,
    resolution,
    duration,
    count,
    style,
    smartLyrics,
    store,
  ])

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-2xl backdrop-blur">
      <div
        className={mediaType === "audio" ? "p-3" : "flex items-start gap-3 p-3"}
      >
        {mediaType !== "audio" && <ReferenceUpload />}
        <PromptInput />
      </div>

      <ReferenceThumbnails />

      {store.isGenerating && (
        <div className="space-y-1.5 border-t border-zinc-800/80 px-3 py-2.5">
          <RequestPending />
        </div>
      )}

      <ParameterBar onGenerate={run} />

      {store.results.length > 0 && (
        <div className="border-t border-zinc-800/80 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">本次生成</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {store.results.map((result) => (
              <div
                key={result.id}
                className="group relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.poster ?? result.url}
                  alt={result.prompt.slice(0, 24)}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                    <Play className="h-4 w-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
