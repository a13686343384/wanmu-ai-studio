"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  Clapperboard,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { TEXT_MODELS } from "@/lib/constants"
import type { ConsultationDTO } from "@/lib/serializers/script"

const SEVERITY_META = {
  high: { label: "必改", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  medium: { label: "建议", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  low: { label: "可选", className: "border-zinc-700 bg-zinc-800/60 text-zinc-400" },
} as const

interface ChatMessage {
  role: "user" | "ai"
  text: string
}

/**
 * 剧本会诊弹窗（与设计稿一致的双栏结构）：
 * 左栏为逐条勾选的建议清单（每条标 结构/台词 + 必改/建议/可选，可忽略、可加想法）；
 * 右栏为选中建议的详情与「对话改法」。顶部提供模型选择、重新会诊与按勾选生成改法。
 */
export function ConsultDialog({
  open,
  onOpenChange,
  scriptId,
  consultation,
  onRefresh,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  consultation: ConsultationDTO | null
  onRefresh: () => void
}) {
  const [running, setRunning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [ignored, setIgnored] = useState<string[]>([])
  const [ideaDrafts, setIdeaDrafts] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatDraft, setChatDraft] = useState("")
  const [chatting, setChatting] = useState(false)

  const suggestions = consultation?.suggestions ?? []
  const mustFixCount = suggestions.filter((s) => s.mustFix).length
  const adviseCount = suggestions.filter((s) => !s.mustFix && s.severity !== "low").length
  const optionalCount = suggestions.filter((s) => !s.mustFix && s.severity === "low").length

  const activeItem = useMemo(
    () => suggestions.find((item) => item.id === activeId) ?? null,
    [suggestions, activeId],
  )

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    )
    setActiveId(id)
  }

  async function runConsult() {
    setRunning(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/consult`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "会诊失败")
      toast.success("会诊完成", { description: `必改 ${payload.data.mustFixCount} 项` })
      setSelected([])
      setIgnored([])
      setMessages([])
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "会诊失败")
    } finally {
      setRunning(false)
    }
  }

  async function applySelected() {
    if (selected.length === 0) {
      toast.error("请先勾选要修改的项")
      return
    }
    setApplying(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/consult/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionIds: selected }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "应用失败")
      toast.success("已按勾选项修改", { description: payload.data.summary })
      setSelected([])
      onRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用失败")
    } finally {
      setApplying(false)
    }
  }

  async function sendChat() {
    const message = chatDraft.trim()
    if (!message) return
    if (!activeItem) {
      toast.error("先在左侧选中一条诊断建议")
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
          suggestion: `${activeItem.issue} → ${activeItem.suggestion}`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[86vh] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-orange-400" />
            剧本会诊 · 结构 + 台词
          </DialogTitle>
          <DialogDescription>
            一次诊断结构 + 台词，逐条勾选（每条标 结构/台词）· 结构问题整集改写、台词问题只改台词词；
            生成改法先预览、满意再应用
          </DialogDescription>
        </DialogHeader>

        {!consultation ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-400">还没有会诊记录</p>
            <p className="mt-1 text-xs text-zinc-600">点击下方按钮，让 AI 通读全剧并出具诊断报告</p>
            <Button variant="brand" className="mt-4" onClick={() => void runConsult()} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
              开始会诊
            </Button>
          </div>
        ) : (
          <>
            {/* 模型 + 操作行 */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="文本模型"
                defaultValue={consultation.model}
                className="h-8 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 text-xs text-zinc-300 outline-none"
              >
                {TEXT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                onClick={() => void runConsult()}
                disabled={running}
              >
                {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                重新会诊
              </Button>

              <Button
                variant="inverse"
                size="sm"
                className="h-8"
                onClick={() => void applySelected()}
                disabled={applying || selected.length === 0}
              >
                {applying ? <Loader2 className="animate-spin" /> : <Check />}
                按勾选的 {selected.length} 项生成改法
              </Button>
            </div>

            {/* 双栏 */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* 左：建议清单 */}
              <div className="flex min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/40">
                <Tabs defaultValue="items" className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-zinc-800/80 px-2.5 pt-2">
                    <TabsList className="w-full">
                      <TabsTrigger value="items" className="flex-1 gap-1 text-[11px]">
                        必改项 ({suggestions.length})
                      </TabsTrigger>
                      <TabsTrigger value="report" className="flex-1 text-[11px]">
                        完整报告
                      </TabsTrigger>
                      <TabsTrigger value="diff" className="flex-1 text-[11px]">
                        改动对比 (0)
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="items" className="flex min-h-0 flex-1 flex-col">
                    <div className="space-y-2 border-b border-zinc-800/70 px-3 pb-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                        <span className="text-xs font-medium text-zinc-300">诊断报告</span>
                        <span className="ml-auto text-[10px] text-zinc-600">
                          模型：{consultation.model}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
                        {consultation.output}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 pt-2 text-[11px] text-zinc-500">
                      <span>建议清单（勾选要改的项）</span>
                      <button
                        type="button"
                        className="text-zinc-400 underline-offset-2 hover:text-orange-300 hover:underline"
                        onClick={() =>
                          setSelected(suggestions.filter((item) => !ignored.includes(item.id)).map((item) => item.id))
                        }
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        className="text-zinc-400 underline-offset-2 hover:text-orange-300 hover:underline"
                        onClick={() => setSelected([])}
                      >
                        全不选
                      </button>
                      <span className="ml-auto">
                        <span className="text-rose-300">必改 {mustFixCount}</span>
                        <span className="ml-1.5 text-amber-300">建议 {adviseCount}</span>
                        <span className="ml-1.5 text-zinc-400">可选 {optionalCount}</span>
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                      {suggestions.map((item) => {
                        const meta = SEVERITY_META[item.severity]
                        const isIgnored = ignored.includes(item.id)
                        const checked = selected.includes(item.id)
                        return (
                          <div
                            key={item.id}
                            onClick={() => setActiveId(item.id)}
                            className={cn(
                              "cursor-pointer rounded-lg border p-2.5 transition-colors",
                              isIgnored
                                ? "border-zinc-800/60 bg-zinc-900/20 opacity-50"
                                : checked
                                  ? "border-orange-500/50 bg-orange-500/[0.06]"
                                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleSelected(item.id, Boolean(value))}
                                className="mt-0.5"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="muted" className="font-normal">
                                    {item.category}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={cn("border font-normal", meta.className)}
                                  >
                                    {item.mustFix ? "必改" : meta.label}
                                  </Badge>
                                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">
                                    {item.issue}
                                  </span>

                                  <button
                                    type="button"
                                    aria-label={isIgnored ? "取消忽略" : "忽略"}
                                    className={cn(
                                      "flex shrink-0 items-center gap-0.5 text-[10px]",
                                      isIgnored ? "text-zinc-500" : "text-zinc-500 hover:text-zinc-300",
                                    )}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setIgnored((current) =>
                                        current.includes(item.id)
                                          ? current.filter((id) => id !== item.id)
                                          : [...current, item.id],
                                      )
                                      setSelected((current) => current.filter((id) => id !== item.id))
                                    }}
                                  >
                                    {isIgnored ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    忽略
                                  </button>
                                </div>

                                {!isIgnored && (
                                  <Textarea
                                    rows={2}
                                    value={ideaDrafts[item.id] ?? ""}
                                    onChange={(event) =>
                                      setIdeaDrafts((current) => ({
                                        ...current,
                                        [item.id]: event.target.value,
                                      }))
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    placeholder="给这条加修改意见 / 想法（可选）—— 可拖右下角调高"
                                    className="mt-2 min-h-[52px] border-zinc-800 bg-zinc-950/60 text-[11px]"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="report" className="min-h-0 flex-1 overflow-y-auto p-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-medium text-zinc-300">诊断报告</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{consultation.output}</p>
                    <p className="mt-3 text-[11px] text-zinc-600">
                      模型：{consultation.model} · 建议 {suggestions.length} 条
                    </p>
                  </TabsContent>

                  <TabsContent value="diff" className="min-h-0 flex-1">
                    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-zinc-600">
                      应用改法后，改动对比会出现在这里
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* 右：建议详情 + 对话改法 */}
              <div className="hidden min-h-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/40 md:flex">
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {activeItem ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="muted" className="font-normal">
                          {activeItem.category}
                        </Badge>
                        {activeItem.mustFix && (
                          <Badge
                            variant="outline"
                            className="border border-rose-500/40 bg-rose-500/10 font-normal text-rose-300"
                          >
                            必改
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-zinc-100">
                        {activeItem.issue}
                      </p>
                      <p className="text-[11px] leading-relaxed text-zinc-500">
                        出处：{activeItem.category === "台词" ? "对应台词段" : "相关剧情段"} ——
                        可在下方问剧本怎么改，确认后按勾选应用。
                      </p>
                      <p className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-[11px] leading-relaxed text-emerald-300/80">
                        <Check className="mr-1 inline h-3 w-3" />
                        {activeItem.suggestion}
                      </p>

                      {messages.length > 0 && (
                        <div className="space-y-2 border-t border-zinc-800/70 pt-2">
                          {messages.map((message, index) => (
                            <div
                              key={index}
                              className={cn(
                                "rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed",
                                message.role === "user"
                                  ? "ml-6 bg-orange-500/10 text-orange-200"
                                  : "mr-2 bg-zinc-900/70 text-zinc-300",
                              )}
                            >
                              {message.text}
                            </div>
                          ))}
                          {chatting && (
                            <div className="mr-2 flex items-center gap-1.5 rounded-lg bg-zinc-900/70 px-2.5 py-1.5 text-[11px] text-zinc-500">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              AI 正在组织改法…
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs text-zinc-600">
                      在左侧点选一条诊断建议，这里展示详情
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800/80 p-2.5">
                  <p className="mb-1.5 text-[10px] text-amber-400/80">
                    每轮对话约消耗 3 —— 一次把想法说清可少来回省智力
                  </p>
                  <div className="flex items-end gap-1.5">
                    <Textarea
                      rows={2}
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                      placeholder="问改法 / 说你的想法…（Enter 发送）"
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
