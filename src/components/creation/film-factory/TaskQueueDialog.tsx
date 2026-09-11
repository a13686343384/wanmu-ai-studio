"use client"

import { useEffect, useRef, useState } from "react"
import { CircleStop, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ScriptSummary } from "@/lib/serializers/script"
import type { ClientTask } from "@/lib/tasks/client"

const activeStates = ["queued", "running", "cancel_requested"]
const labels: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  cancel_requested: "停止收尾中",
  cancelled: "已停止",
  succeeded: "已完成",
  failed: "未完成",
}

/** Display persisted tasks; cancelling a script status does not cancel generation work. */
export function TaskQueueDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scripts: ScriptSummary[]
  onChanged: () => void
}) {
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stoppingId, setStoppingId] = useState<string | null>(null)
  const stopLock = useRef(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!open) return
    let disposed = false
    let reading = false
    setLoading(true)
    const read = async () => {
      if (reading) return
      reading = true
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "读取任务失败")
        if (!disposed) {
          setTasks(payload.data)
          setError(null)
        }
      } catch (e) {
        if (!disposed) setError(e instanceof Error ? e.message : "读取任务失败")
      } finally {
        reading = false
        if (!disposed) setLoading(false)
      }
    }
    void read()
    const timer = setInterval(() => void read(), 1500)
    return () => {
      disposed = true
      clearInterval(timer)
    }
  }, [open, revision])
  async function stopOne(task: ClientTask) {
    if (stopLock.current) return
    stopLock.current = true
    setStoppingId(task.id)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "PATCH" })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "请求停止失败")
      const updated = payload.data as ClientTask
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      if (updated.state === "cancelled")
        toast.success("任务已停止，已完成产物已保留")
      else if (updated.state === "cancel_requested")
        toast.info("已请求停止，当前请求收尾中")
      else toast.info("任务已结束，请查看最终结果")
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "请求停止失败")
    } finally {
      stopLock.current = false
      setStoppingId(null)
    }
  }
  const running = tasks.filter((task) => activeStates.includes(task.state))
  const history = tasks.filter((task) => !activeStates.includes(task.state))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>任务队列</DialogTitle>
          <DialogDescription>
            最近 50 项任务 · 进行中 {running.length} · 历史 {history.length}
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在读取任务
          </p>
        )}
        {error && (
          <div role="alert" className="text-xs text-orange-300">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevision((value) => value + 1)}
            >
              重试读取
            </Button>
          </div>
        )}
        {[
          ["进行中", running],
          ["历史", history],
        ].map(([label, rows]) => (
          <section key={String(label)} className="space-y-2">
            <h3 className="text-sm text-zinc-300">{String(label)}</h3>
            {!(rows as ClientTask[]).length ? (
              <p className="text-xs text-zinc-500">
                {loading ? "正在读取…" : "暂无任务"}
              </p>
            ) : (
              (rows as ClientTask[]).map((task) => (
                <div
                  key={task.id}
                  data-testid="queue-task"
                  className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-orange-300">
                      {labels[task.state] ?? task.state}
                    </span>
                    <span className="min-w-0 flex-1 text-xs text-zinc-200">
                      {task.state === "cancel_requested"
                        ? "已请求停止，当前请求收尾中"
                        : task.currentLabel}
                    </span>
                    {activeStates.includes(task.state) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !!stoppingId || task.state === "cancel_requested"
                        }
                        onClick={() => void stopOne(task)}
                      >
                        {stoppingId === task.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CircleStop className="h-3.5 w-3.5" />
                        )}
                        {task.state === "cancel_requested"
                          ? "等待停止确认"
                          : "请求停止"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    成功 {task.completed} · 失败 {task.failed}
                    {task.total !== null ? ` · 共 ${task.total} 项` : ""}
                  </p>
                  {task.error && (
                    <p role="alert" className="text-xs text-orange-300">
                      {task.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}

export function StopAllDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  runningCount?: number
  onConfirm: () => Promise<boolean>
}) {
  const [stopping, setStopping] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    let disposed = false
    setCount(null)
    setError(null)
    void fetch("/api/tasks?active=1", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "读取任务失败")
        if (!disposed)
          setCount(
            (payload.data as ClientTask[]).filter((task) =>
              ["queued", "running"].includes(task.state),
            ).length,
          )
      })
      .catch((e) => {
        if (!disposed) setError(e instanceof Error ? e.message : "读取任务失败")
      })
    return () => {
      disposed = true
    }
  }, [open])
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!stopping) onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>停止全部流程</DialogTitle>
          <DialogDescription>
            向当前可访问工作区的后台任务发送停止请求。已在执行的供应商请求需要收尾，最终状态以任务队列为准；已完成产物保留。同步短请求不在本队列中。
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-zinc-400">
          {count === null ? "正在读取后台任务…" : `可请求停止 ${count} 项任务`}
        </p>
        {error && (
          <p role="alert" className="text-xs text-orange-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            disabled={stopping}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={stopping || count === null || count === 0 || !!error}
            onClick={async () => {
              setStopping(true)
              try {
                if (await onConfirm()) onOpenChange(false)
              } finally {
                setStopping(false)
              }
            }}
          >
            {stopping && <Loader2 className="animate-spin" />}请求全部停止
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
