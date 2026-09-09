"use client"

import { useState } from "react"
import { ArrowUp, AudioLines, ChevronDown, Coins, Image as ImageIcon, Mic, Video, Wand2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AUDIO_MODELS,
  IMAGE_MODELS,
  TEXT_MODELS,
  VIDEO_MODELS,
  type AIModel,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { StudioNodeKind } from "./types"
import { useReactFlow } from "@xyflow/react"

const MODEL_LIST: Record<"text" | "image" | "video" | "audio", readonly AIModel[]> = {
  text: TEXT_MODELS,
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  audio: AUDIO_MODELS,
}

const DEFAULT_MODEL: Record<"text" | "image" | "video" | "audio", string> = {
  text: TEXT_MODELS[0]!.id,
  image: IMAGE_MODELS[0]!.id,
  video: VIDEO_MODELS[0]!.id,
  audio: AUDIO_MODELS[0]!.id,
}

const PLACEHOLDER =
  "描述任何你想要生成的内容，按 @ 引用素材，/ 呼出指令"

/**
 * 画布操作页的 AI Composer：选中节点时出现在节点下方，
 * 按节点类型提供模型清单与参数行，发送调用统一生成接口并把产物写回节点。
 */
export function StudioComposer({
  nodeId,
  kind,
  prompt,
  modelId,
}: {
  nodeId: string
  kind: StudioNodeKind
  prompt?: string
  modelId?: string
}) {
  const composerKind = kind === "director" || kind === "action" || kind === "sticky" ? "text" : kind
  const models = MODEL_LIST[composerKind]
  const [draft, setDraft] = useState(prompt ?? "")
  const [model, setModel] = useState(modelId ?? DEFAULT_MODEL[composerKind])
  const [running, setRunning] = useState(false)
  const { updateNodeData } = useReactFlow()

  const current = models.find((item) => item.id === model) ?? models[0]!

  async function send() {
    if (!draft.trim() || running) return
    setRunning(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: composerKind,
          prompt: draft.trim(),
          modelId: model,
          aspectRatio: "16:9",
          resolution: composerKind === "image" ? "1K" : "480p",
          duration: "5s",
          count: 1,
          references: [],
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      if (composerKind === "text") {
        updateNodeData(nodeId, {
          text: payload.data.text,
          prompt: draft.trim(),
          modelId: model,
        })
      } else {
        updateNodeData(nodeId, {
          url: payload.data.url,
          prompt: draft.trim(),
          modelId: model,
        })
      }
      window.dispatchEvent(new CustomEvent("studio:generated"))
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("studio:error", {
          detail: error instanceof Error ? error.message : "生成失败",
        }),
      )
    } finally {
      setRunning(false)
    }
  }

  const KindIcon =
    composerKind === "image" ? ImageIcon : composerKind === "video" ? Video : composerKind === "audio" ? AudioLines : Wand2

  return (
    <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5 shadow-xl backdrop-blur">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void send()
          }
        }}
        rows={2}
        placeholder={PLACEHOLDER}
        className="w-full resize-none bg-transparent text-xs leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {/* 模型选择 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex max-w-[180px] items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-zinc-700"
            >
              <KindIcon className="h-3 w-3 shrink-0 text-orange-400" />
              <span className="truncate">{current.name}</span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {models.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => setModel(item.id)}
                className={cn("flex-col items-start gap-0.5 py-2", item.id === model && "bg-zinc-800")}
              >
                <span className="flex w-full items-center gap-2 text-sm text-zinc-100">
                  {item.name}
                  {item.builtIn && (
                    <span className="rounded border border-zinc-700 px-1 text-[10px] text-zinc-500">内置</span>
                  )}
                  {item.id === model && <span className="ml-auto text-orange-400">✓</span>}
                </span>
                <span className="flex items-center gap-1 pl-6 text-[11px] text-zinc-500">
                  <Coins className="h-3 w-3 text-amber-400" />
                  {item.cost} 起 · {item.note}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 类型化参数行（展示为主，与设计稿一致） */}
        {composerKind === "image" && (
          <span className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400">
            16:9 · 低画质 · 2K · 不透明
          </span>
        )}
        {composerKind === "video" && (
          <span className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400">
            全能参考 · 16:9 · 480p · 5s
          </span>
        )}
        {composerKind === "audio" && (
          <span className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400">
            音乐 · 自适应
          </span>
        )}
        {composerKind === "text" && (
          <span className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400">
            <Wand2 className="h-3 w-3" />
            续写 / 改写
          </span>
        )}
        {composerKind === "audio" && (
          <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 text-zinc-500">
            <Mic className="h-3 w-3" />
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-1.5 py-1 text-[11px] text-amber-300">
            <Coins className="h-3 w-3" />
            {current.cost}
          </span>
          <button
            type="button"
            aria-label="生成"
            data-testid="studio-composer-send"
            onClick={() => void send()}
            disabled={running || !draft.trim()}
            className="flex h-6 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200 transition-colors hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
