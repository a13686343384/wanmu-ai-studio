"use client"

import { useState } from "react"
import { AlertTriangle, Check, Clapperboard, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ConsultationDTO } from "@/lib/serializers/script"

const SEVERITY_META = {
  high: { label: "高", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
  medium: { label: "中", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  low: { label: "低", className: "border-zinc-700 bg-zinc-800/60 text-zinc-400" },
} as const

/**
 * 剧本会诊弹窗。
 * 展示诊断报告与建议清单，支持勾选「要改的项」（逐步确认模式）后一键应用。
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

  const suggestions = consultation?.suggestions ?? []
  const mustFixCount = suggestions.filter((s) => s.mustFix).length

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-orange-400" />
            剧本会诊
          </DialogTitle>
          <DialogDescription>
            请「剧本医生」通读全剧出诊断报告。默认「逐步确认」——勾选要改的项再一键修改，不勾选则不动原文。
          </DialogDescription>
        </DialogHeader>

        {!consultation ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-400">还没有会诊记录</p>
            <p className="mt-1 text-xs text-zinc-600">点击下方按钮，让 AI 通读全剧并出具诊断报告</p>
            <Button variant="brand" className="mt-4" onClick={() => void runConsult()} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
              开始会诊
            </Button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                  诊断报告
                </span>
                <Badge variant="brand" className="ml-auto font-normal">
                  必改 {mustFixCount} 项
                </Badge>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{consultation.output}</p>
              <p className="mt-2 text-[11px] text-zinc-600">
                模型：{consultation.model} · 建议 {suggestions.length} 条
              </p>
            </section>

            <Separator />

            <section className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                建议清单（勾选要改的项）
              </p>

              {suggestions.map((item) => {
                const meta = SEVERITY_META[item.severity]
                const checked = selected.includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                      checked
                        ? "border-orange-500/50 bg-orange-500/[0.06]"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setSelected((current) =>
                          value ? [...current, item.id] : current.filter((id) => id !== item.id),
                        )
                      }
                      className="mt-0.5"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="muted" className="font-normal">
                          {item.category}
                        </Badge>
                        <Badge variant="outline" className={cn("border font-normal", meta.className)}>
                          {meta.label}
                        </Badge>
                        {item.mustFix && (
                          <span className="flex items-center gap-0.5 text-[10px] text-rose-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            必改
                          </span>
                        )}
                      </span>

                      <span className="mt-1.5 block text-xs leading-relaxed text-zinc-300">
                        {item.issue}
                      </span>
                      <span className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-emerald-300/80">
                        <Check className="mt-0.5 h-3 w-3 shrink-0" />
                        {item.suggestion}
                      </span>
                    </span>
                  </label>
                )
              })}
            </section>
          </>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => void runConsult()}
            disabled={running}
          >
            {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
            重新会诊
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button
              variant="inverse"
              onClick={() => void applySelected()}
              disabled={applying || selected.length === 0}
            >
              {applying ? <Loader2 className="animate-spin" /> : <Check />}
              修改选中项（{selected.length}）
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
