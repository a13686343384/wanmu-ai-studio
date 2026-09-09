"use client"

import { useState } from "react"
import {
  AudioLines,
  ChevronDown,
  Coins,
  Image as ImageIcon,
  PanelRightClose,
  Plus,
  Send,
  Sparkles,
  TextQuote,
  Video,
  Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { StudioNodeKind } from "./types"

const MODEL_TABS: { key: StudioNodeKind; label: string; icon: typeof ImageIcon }[] = [
  { key: "image", label: "图片", icon: ImageIcon },
  { key: "video", label: "视频", icon: Video },
  { key: "text", label: "文本", icon: TextQuote },
  { key: "audio", label: "音频", icon: AudioLines },
]

const SUGGESTIONS = ["来点灵感", "写段文案", "拆个分镜", "这段有点平", "梳理一下叙事"]

/**
 * 右侧 Manvo Agent 栈（可展开 / 收起）。
 * 默认模型选择、问候与建议、对引用节点的操作输入。
 */
export function AgentDock({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<StudioNodeKind>("image")
  const [draft, setDraft] = useState("")

  function send() {
    setDraft("")
  }

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-zinc-800/80 bg-zinc-950/85 backdrop-blur">
      {/* 头部 */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 px-3 py-2">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-zinc-300">
          <Workflow className="h-3.5 w-3.5" />
          工作流
          <span className="rounded bg-emerald-500/15 px-1 text-[9px] text-emerald-400">NEW</span>
        </Button>

        <div className="ml-auto flex items-center gap-1">
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
              <p className="px-1 pb-1 text-[11px] text-zinc-500">
                默认生成模型 · 选择即设为默认
              </p>
              <div className="flex rounded-lg bg-zinc-900 p-0.5">
                {MODEL_TABS.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                        tab === item.key ? "bg-zinc-800 text-zinc-100" : "text-zinc-500",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 border-t border-zinc-800/70 pt-2">
                <p className="px-1 pb-1 text-[10px] text-zinc-600">自动执行计划</p>
                <p className="px-1 text-[10px] leading-relaxed text-zinc-600">
                  agent 执行计划后自动批准，无需每次点确认
                </p>
              </div>
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
      </div>

      {/* 问候 + 建议 */}
      <div className="flex min-h-0 flex-1 flex-col justify-end p-4">
        <div className="mb-3">
          <p className="text-[11px] text-zinc-600">· Hi 用户0272!</p>
          <p className="mt-0.5 text-lg font-medium text-zinc-100">今天一起创作点什么？</p>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
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

        {/* 输入区 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5">
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            placeholder="描述你想对引用节点执行的操作"
            className="w-full resize-none bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              <Sparkles className="h-3 w-3" />
              风格
            </button>
            <button
              type="button"
              aria-label="发送"
              onClick={send}
              disabled={!draft.trim()}
              className="ml-auto flex h-6 w-8 items-center justify-center rounded-md bg-zinc-700 text-zinc-200 transition-colors hover:bg-orange-500 hover:text-white disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-700">
          <Coins className="h-3 w-3" />
          生成会按模型计费
        </p>
      </div>
    </aside>
  )
}
