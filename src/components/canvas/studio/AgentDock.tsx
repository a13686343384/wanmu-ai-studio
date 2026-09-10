"use client"
import { useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  Loader2,
  PanelRightClose,
  Plus,
  Send,
  Sparkles,
  Video,
  Workflow,
} from "lucide-react"
import { useReactFlow } from "@xyflow/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  AUDIO_MODELS,
} from "@/lib/constants"
import { useStudio } from "./types"
const SUGGESTIONS = ["来点灵感", "写段文案", "拆个分镜", "这段有点平", "梳理一下叙事"]

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
  const [autoPlan, setAutoPlan] = useState(false)
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
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-950/95">
      {/* 顶栏 */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <button
          type="button"
          onClick={() => toast.info("工作流", { description: "可视化编排 · 即将上线" })}
          className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-600"
        >
          <Workflow className="h-3 w-3" />
          工作流
          <span className="rounded bg-emerald-500/15 px-1 text-[9px] text-emerald-400">NEW</span>
        </button>

        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-zinc-200">
          <span className="text-rose-400">◆</span>
          Manvo Agent
        </span>

        {/* 默认模型 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-600"
            >
              <Sparkles className="h-3 w-3 text-rose-400" />
              默认模型
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <p className="px-1 pb-1.5 text-[11px] text-zinc-500">默认生成模型 · 选择即设为默认</p>
            <div className="flex rounded-lg bg-zinc-900 p-0.5">
              {(Object.keys(MODELS) as (keyof typeof MODELS)[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setKind(key)
                    setModel(MODELS[key][0]!.id)
                  }}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                    kind === key ? "bg-zinc-800 text-zinc-100" : "text-zinc-500",
                  )}
                >
                  {{ text: "文本", image: "图片", video: "视频", audio: "音频" }[key]}
                </button>
              ))}
            </div>
            <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
              {MODELS[kind].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModel(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    item.id === model ? "bg-zinc-800" : "hover:bg-zinc-900",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{item.name}</span>
                  <span className="text-[10px] text-zinc-600">{item.cost} 起</span>
                  {item.id === model && <Check className="h-3 w-3 text-orange-400" />}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-zinc-800/70 px-1 pt-2">
              <span className="text-[11px] text-zinc-400">自动执行计划</span>
              <Switch checked={autoPlan} onCheckedChange={setAutoPlan} />
            </div>
            <p className="px-1 pt-1 text-[10px] leading-relaxed text-zinc-600">
              agent 执行计划后自动批准，无需每次点确认
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          aria-label="收起 Agent"
          onClick={onClose}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 消息 / 问候 */}
      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto p-4">
        {messages.length > 0 && (
          <div className="mb-4 space-y-2">
            {messages.map((text, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-6",
                  i % 2 ? "bg-zinc-900 text-zinc-300" : "bg-orange-500/10 text-orange-200",
                )}
              >
                {text}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-zinc-600">· Hi 用户0272!</p>
        <p className="mt-1 text-lg font-medium leading-7 text-zinc-100">今天一起创作点什么？</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDraft(item)}
              className="rounded-full border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* 输入卡 */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
        className="p-3"
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="flex h-7 w-9 flex-col items-center justify-center overflow-hidden rounded-md border border-zinc-700 text-zinc-500">
              <Video className="h-3 w-3" />
              <span className="text-[7px] leading-none">Video</span>
            </span>
            <button
              type="button"
              aria-label="添加引用"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            aria-label="Agent 创作要求"
            rows={2}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-lg bg-zinc-950/80 px-2.5 py-2 text-xs leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
            placeholder="描述你想对引用节点执行的操作"
          />
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              风格
            </span>
            <button
              type="submit"
              aria-label="生成到画布"
              disabled={running || !draft.trim()}
              className="ml-auto flex h-6 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200 transition-colors hover:bg-orange-500 hover:text-white disabled:opacity-40"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </form>
    </aside>
  )
}
