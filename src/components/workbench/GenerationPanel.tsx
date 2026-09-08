"use client"

import { useCallback } from "react"
import { AlertCircle, Play } from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { ReferenceUpload, ReferenceThumbnails } from "@/components/workbench/ReferenceUpload"
import { PromptInput } from "@/components/workbench/PromptInput"
import { ParameterBar } from "@/components/workbench/ParameterBar"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"

const STAGES: Record<string, string[]> = {
  video: ["解析提示词", "生成关键帧", "合成视频", "编码输出"],
  image: ["解析提示词", "构建画面", "渲染出图"],
  audio: ["解析风格", "生成音轨", "混音输出"],
}

/**
 * 工作台生成面板：参考素材 + 提示词 + 参数栏。
 * 负责调用 /api/ai/generate 并推进进度条、展示结果。
 */
export function GenerationPanel() {
  const store = useWorkbenchStore()
  const { mediaType, prompt, modelId, references, aspectRatio, resolution, duration, count, style, smartLyrics } =
    store

  const run = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("请先描述你想要的内容")
      return
    }

    store.setGenerating(true, 0, "准备中…")

    const stages = STAGES[mediaType] ?? STAGES.image
    let stageIndex = 0
    const timer = window.setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1)
      const next = Math.min(store.progress + 8 + Math.random() * 14, 92)
      store.setProgress(Math.round(next), stages[stageIndex])
    }, 450)

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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

      window.clearInterval(timer)
      store.setProgress(100, "完成")

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
      window.clearInterval(timer)
      toast.error(error instanceof Error ? error.message : "生成失败，请稍后重试")
    } finally {
      window.setTimeout(() => store.setGenerating(false, 0, ""), 600)
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
      <div className={mediaType === "audio" ? "p-3" : "flex items-start gap-3 p-3"}>
        {mediaType !== "audio" && <ReferenceUpload />}
        <PromptInput />
      </div>

      <ReferenceThumbnails />

      {store.isGenerating && (
        <div className="space-y-1.5 border-t border-zinc-800/80 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <AlertCircle className="h-3.5 w-3.5 animate-pulse text-orange-400" />
              {store.progressLabel || "生成中…"}
            </span>
            <span className="tabular-nums text-zinc-500">{store.progress}%</span>
          </div>
          <Progress value={store.progress} />
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
