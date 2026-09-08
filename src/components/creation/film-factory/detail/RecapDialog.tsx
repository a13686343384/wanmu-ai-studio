"use client"

import { useState } from "react"
import { ChevronDown, FileText, Loader2, MessageSquare, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TEXT_MODELS } from "@/lib/constants"
import type { EpisodeDTO } from "@/lib/serializers/script"

export interface RecapResult {
  recap: string
  beats: string[]
}

/**
 * 「先让 AI 复述理解本集」弹窗（与设计稿一致）：
 * 左侧为 AI 的理解 / 解析原文，右侧为纠偏对话；
 * 确认后「存为导演理解」，拆分镜时自动带上。
 */
export function RecapDialog({
  open,
  onOpenChange,
  scriptId,
  episodeId,
  episodeTitle,
  episode,
  result,
  onLoaded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  episodeId: string
  episodeTitle: string
  episode: EpisodeDTO | null
  result: RecapResult | null
  onLoaded: (result: RecapResult) => void
}) {
  const [running, setRunning] = useState(false)
  const [model, setModel] = useState("ovlm-5.6")
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([])
  const [chatDraft, setChatDraft] = useState("")
  const [chatting, setChatting] = useState(false)

  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/episodes/${episodeId}/recap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "复述失败")
      onLoaded({ recap: payload.data.recap, beats: payload.data.beats })
      toast.success("AI 已复述本集")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "复述失败")
    } finally {
      setRunning(false)
    }
  }

  async function sendChat() {
    const message = chatDraft.trim()
    if (!message) return
    if (!result) {
      toast.error("先让 AI 复述理解本集")
      return
    }

    setChatDraft("")
    setMessages((current) => [...current, { role: "user", text: message }])
    setChatting(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/consult/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          suggestion: `本集复述理解：${result.recap.slice(0, 200)}`,
          message,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "发送失败")
      setMessages((current) => [...current, { role: "ai", text: payload.data.reply }])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送失败")
    } finally {
      setChatting(false)
    }
  }

  function saveAsDirectorNote() {
    if (!result) {
      toast.error("还没有复述结果")
      return
    }
    toast.success("已存为导演理解", { description: "拆分镜时会自动带上" })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            AI 复述理解 · {episodeTitle}
          </DialogTitle>
          <DialogDescription>
            先看 AI 复述它对本集大纲的理解，有偏差就对话纠正；确认后【存为导演理解】——
            拆分镜时自动带上，不改动已定稿的本集大纲正文。
          </DialogDescription>
        </DialogHeader>

        {/* 全剧设定补充（折叠面板） */}
        <details className="group rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-zinc-300">
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            全剧设定补充
            <span className="text-[10px] text-zinc-600">复述会自动参照它，避免重复回答过的问题</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-zinc-500 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            还没有已确认的全剧设定。你在复述理解里澄清/确认过的跨集事实（产权、人物关系、时间线、
            动机定位…）会自动聚焦在这里；每行一条。
          </p>
        </details>

        {/* 文本模型 */}
        <div className="space-y-1">
          <p className="text-[11px] text-zinc-500">文本模型</p>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEXT_MODELS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 双栏 */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          {/* 左：AI 的理解 / 解析原文 */}
          <div className="flex min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/40">
            <Tabs defaultValue="recap" className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-zinc-800/80 px-2.5 pt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="recap" className="flex-1 text-[11px]">
                    AI 的理解
                  </TabsTrigger>
                  <TabsTrigger value="source" className="flex-1 text-[11px]">
                    解析原文
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="recap" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                {result ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-zinc-300">{result.recap}</p>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                      <p className="text-[11px] font-medium text-zinc-400">建议镜组节奏</p>
                      <ol className="mt-1.5 space-y-1">
                        {result.beats.map((beat, index) => (
                          <li key={beat} className="flex gap-1.5 text-[11px] leading-relaxed text-zinc-400">
                            <span className="shrink-0 font-medium tabular-nums text-orange-400">
                              {index + 1}.
                            </span>
                            {beat}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                    <p className="max-w-xs text-xs leading-relaxed text-zinc-500">
                      还没有复述。让 AI 通读本集大纲，用自己的话复述它的理解，你核对有没有偏差。
                    </p>
                    <Button variant="brand" size="sm" onClick={() => void run()} disabled={running}>
                      {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      让 AI 复述理解（3/次）
                    </Button>
                    <p className="text-[10px] text-zinc-600">结果会缓存，重开同一集不重复请求</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="source" className="min-h-0 flex-1 overflow-y-auto p-3">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400">
                  {episode?.content ?? "本集正文会显示在这里"}
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* 右：纠偏对话 */}
          <div className="hidden min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/40 md:flex">
            <div className="border-b border-zinc-800/80 px-3 py-2 text-[11px] text-zinc-400">
              纠偏对话（指出理解偏差 / 补充你的真实意图）
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-zinc-600">
                  例如「主角动机你理解错了，他不是为了钱，是为了赎罪」「第3集其实是伏笔，不是转折」…
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={
                      message.role === "user"
                        ? "ml-6 rounded-lg bg-orange-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-orange-200"
                        : "mr-2 rounded-lg bg-zinc-900/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-zinc-300"
                    }
                  >
                    {message.text}
                  </div>
                ))
              )}
              {chatting && (
                <div className="mr-2 flex items-center gap-1.5 rounded-lg bg-zinc-900/70 px-2.5 py-1.5 text-[11px] text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 正在回应…
                </div>
              )}
            </div>

            <div className="flex items-end gap-1.5 border-t border-zinc-800/80 p-2.5">
              <Textarea
                rows={2}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="指出偏差 / 补充意图…（Enter 发送，Shift+Enter 换行）"
                className="min-h-[48px] flex-1 border-zinc-800 bg-zinc-900/60 text-[11px]"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void sendChat()
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => void sendChat()}
                disabled={chatting || !chatDraft.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                发送
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="flex items-center gap-1 text-[11px] text-amber-400">
            <MessageSquare className="h-3 w-3" />
            3 / 次
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button variant="inverse" size="sm" onClick={saveAsDirectorNote} disabled={!result}>
              <Sparkles />
              存为导演理解（拆分镜时应用）
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
