"use client"
import { useRef, useState } from "react"
import { Loader2, PanelRightClose, Send, Sparkles } from "lucide-react"
import { useReactFlow } from "@xyflow/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  AUDIO_MODELS,
} from "@/lib/constants"
import { useStudio } from "./types"
const MODELS = {
  text: TEXT_MODELS,
  image: IMAGE_MODELS,
  video: VIDEO_MODELS,
  audio: AUDIO_MODELS,
}
export function AgentDock({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<keyof typeof MODELS>("text")
  const [model, setModel] = useState(TEXT_MODELS[0]!.id)
  const [draft, setDraft] = useState("")
  const [running, setRunning] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const lock = useRef(false)
  const { getNodes, setNodes, screenToFlowPosition } = useReactFlow()
  const { beforeChange } = useStudio()
  async function send() {
    if (!draft.trim() || lock.current) return
    lock.current = true
    setRunning(true)
    const request = draft
    try {
      const context = getNodes()
        .filter((node) => node.selected)
        .map((node) => node.data.text ?? node.data.label)
        .join("\n")
        .slice(0, 1000)
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: kind,
          modelId: model,
          prompt: `${context ? `参考：${context}\n` : ""}${request}`.slice(
            0,
            2000,
          ),
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 - 160,
        y: window.innerHeight / 2 - 100,
      })
      beforeChange()
      setNodes((nodes) => [
        ...nodes,
        {
          id: crypto.randomUUID(),
          type: kind,
          position,
          data: {
            kind,
            label: `Agent · ${request.slice(0, 16)}`,
            prompt: request,
            modelId: model,
            ...(kind === "text"
              ? { text: payload.data.text }
              : { url: payload.data.url }),
          },
        },
      ])
      setMessages((items) => [
        ...items,
        request,
        kind === "text"
          ? payload.data.text
          : "生成结果已添加到画布，可在侧栏定位。",
      ])
      setDraft((current) => (current === request ? "" : current))
      window.dispatchEvent(new CustomEvent("studio:generated"))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败")
    } finally {
      lock.current = false
      setRunning(false)
    }
  }
  return (
    <aside className="right-0 flex h-full w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <header className="flex items-center gap-2 border-b border-zinc-800 p-3 text-sm text-zinc-200">
        <Sparkles className="h-4 w-4 text-orange-500" />
        Manvo Agent
        <button
          aria-label="关闭 Agent"
          onClick={onClose}
          className="ml-auto text-zinc-500"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length ? (
          messages.map((text, i) => (
            <p
              key={i}
              className={`whitespace-pre-wrap rounded-xl p-3 text-xs leading-6 ${i % 2 ? "bg-zinc-900 text-zinc-300" : "bg-orange-500/10 text-orange-200"}`}
            >
              {text}
            </p>
          ))
        ) : (
          <p className="my-auto text-sm leading-7 text-zinc-500">
            描述要创作的内容。选中的文本节点会作为上下文，生成结果会添加到画布。
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="space-y-3 border-t border-zinc-800 p-3"
      >
        <div className="flex gap-2">
          <select
            aria-label="Agent 媒体类型"
            value={kind}
            disabled={running}
            onChange={(e) => {
              const next = e.target.value as keyof typeof MODELS
              setKind(next)
              setModel(MODELS[next][0]!.id)
            }}
            className="rounded border border-zinc-800 bg-zinc-900 p-1 text-xs"
          >
            <option value="text">文本</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
          </select>
          <select
            aria-label="Agent 模型"
            value={model}
            disabled={running}
            onChange={(e) => setModel(e.target.value)}
            className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 p-1 text-xs"
          >
            {MODELS[kind].map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          aria-label="Agent 创作要求"
          rows={3}
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs"
          placeholder="今天想创作什么？"
        />
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={running || !draft.trim()}
        >
          {running ? <Loader2 className="animate-spin" /> : <Send />}生成到画布
        </Button>
      </form>
    </aside>
  )
}
