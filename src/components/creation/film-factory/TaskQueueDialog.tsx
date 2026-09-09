"use client"

import { useEffect, useState } from "react"
import { CircleStop, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/creation/film-factory/StatusBadge"
import type { ScriptSummary } from "@/lib/serializers/script"

/**
 * 任务队列弹窗（img-18）：
 * 进行中 = processingStatus 为 processing 的剧本，可单独停止；
 * 历史 = 已完成 / 失败的剧本（含完成时间与状态点）。
 */
export function TaskQueueDialog({
  open,
  onOpenChange,
  scripts,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scripts: ScriptSummary[]
  onChanged: () => void
}) {
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  const running = scripts.filter((s) => s.processingStatus === "processing")
  const history = scripts.filter((s) => s.processingStatus !== "processing")

  async function stopOne(script: ScriptSummary) {
    setStoppingId(script.id)
    try {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processingStatus: "idle", progressLabel: "已手动停止" }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "停止失败")
      toast.success(`已停止「${script.title}」`)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "停止失败")
    } finally {
      setStoppingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>任务队列</DialogTitle>
          <DialogDescription>
            进行中 {running.length} · 历史 {history.length}
          </DialogDescription>
        </DialogHeader>

        {running.length > 0 && (
          <section className="space-y-1.5">
            <p className="text-[11px] font-medium text-zinc-400">进行中</p>
            {running.map((script) => (
              <div
                key={script.id}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">{script.title}</span>
                <span className="hidden text-[10px] text-zinc-500 sm:block">
                  {script.progressLabel ?? "处理中"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={stoppingId === script.id}
                  onClick={() => void stopOne(script)}
                >
                  {stoppingId === script.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CircleStop className="h-3 w-3" />
                  )}
                  停止
                </Button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-1.5">
          <p className="text-[11px] font-medium text-zinc-400">历史</p>
          {history.length === 0 ? (
            <p className="py-4 text-center text-xs text-zinc-600">还没有历史任务</p>
          ) : (
            history.map((script) => (
              <div
                key={script.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2.5"
              >
                <span
                  className={
                    script.status === "completed"
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                      : "h-1.5 w-1.5 rounded-full bg-zinc-600"
                  }
                />
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{script.title}</span>
                <span className="text-[10px] text-zinc-600">
                  {script.updatedAt.slice(5, 16).replace("T", " ")}
                </span>
                <StatusBadge status={script.status} processing={script.processingStatus} />
              </div>
            ))
          )}
        </section>
      </DialogContent>
    </Dialog>
  )
}

/** 停止全部流程确认弹窗（img-19）。 */
export function StopAllDialog({
  open,
  onOpenChange,
  runningCount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  runningCount: number
  onConfirm: () => void
}) {
  const [stopping, setStopping] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>停止全部流程</DialogTitle>
          <DialogDescription>
            确定要停止当前所有正在跑的工厂流程吗？包括所有剧本的调色 / 拆本 / 优化 /
            拆分镜，以及出图 / 视频批次。已生成的内容不受影响。
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={stopping}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={stopping}
            onClick={() => {
              setStopping(true)
              onConfirm()
              setStopping(false)
              onOpenChange(false)
            }}
          >
            {stopping ? <Loader2 className="animate-spin" /> : <X />}
            全部停止
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
