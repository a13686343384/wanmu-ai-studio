"use client"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CardSelect } from "@/components/ui/card-select"
import { useAiModels } from "@/hooks/useAiModels"
import { RequestPending } from "@/components/shared/RequestPending"
import { startTask, type ClientTask } from "@/lib/tasks/client"
type Mode = "text" | "image" | "video" | "bgm"
export function SplitStoryboardDialog({
  open,
  onOpenChange,
  scriptId,
  episodeId,
  episodeTitle,
  initialMode,
  onDone,
  onSplitPhase,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  episodeId: string
  episodeTitle: string
  initialMode?: Mode
  onDone: () => void
  onSplitPhase?: (
    info: { active: boolean; label: string; mode: Mode } | null,
  ) => void
}) {
  const [tab, setTab] = useState<Mode>(initialMode ?? "text")
  const {
    models,
    loading: modelsLoading,
    error: modelsError,
  } = useAiModels(tab === "bgm" ? "audio" : "text")
  const [model, setModel] = useState("")
  const [running, setRunning] = useState(false)
  const lock = useRef(false)
  const epoch = useRef(0)
  const [prompt, setPrompt] = useState("为本集创作配乐")
  const [task, setTask] = useState<ClientTask | null>(null)
  const [stopping, setStopping] = useState(false)
  const stopLock = useRef(false)
  useEffect(() => {
    if (open && !running) setTab(initialMode ?? "text")
  }, [open, initialMode, running])
  useEffect(() => {
    if (!models.some((item) => item.id === model)) setModel(models[0]?.id ?? "")
  }, [models, model])
  useEffect(() => {
    const currentEpoch = epoch
    ++currentEpoch.current
    lock.current = false
    setRunning(false)
    setTask(null)
    return () => {
      ++currentEpoch.current
    }
  }, [episodeId])
  async function run() {
    if (lock.current || !model || modelsLoading) return
    const token = epoch.current
    lock.current = true
    setRunning(true)
    const stillHere = () => epoch.current === token
    try {
      if (tab === "bgm") {
        const res = await fetch(
          `/api/scripts/${scriptId}/episodes/${episodeId}/bgm`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model,
              prompt,
              duration: "15s",
              smartLyrics: false,
            }),
          },
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "配乐生成失败")
        if (stillHere()) toast.success("配乐已生成")
      } else {
        onSplitPhase?.({ active: true, label: "AI正在拆分镜…", mode: "text" })
        await startTask(
          {
            kind: "split",
            scriptId,
            episodeId,
            body: { model, mode: "text", regenerate: true },
          },
          (update) => {
            if (!stillHere()) return
            setTask(update)
            onSplitPhase?.({
              active: ["queued", "running", "cancel_requested"].includes(
                update.state,
              ),
              label: update.currentLabel,
              mode: "text",
            })
          },
        )
        if (stillHere())
          toast.success("整剧拆分镜完成", {
            description: "请完成出片前校验，再配置段资产或进入视频阶段",
          })
      }
      if (stillHere()) {
        onDone()
        onOpenChange(false)
      }
    } catch (e) {
      if (stillHere()) {
        const message = e instanceof Error ? e.message : "执行失败"
        if (message === "任务已停止") toast.info(message)
        else toast.error(message)
      }
    } finally {
      if (stillHere()) {
        lock.current = false
        setRunning(false)
        setTask(null)
        onSplitPhase?.(null)
      }
    }
  }
  async function stop() {
    if (!task || stopLock.current) return
    stopLock.current = true
    setStopping(true)
    const token = epoch.current
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "PATCH" })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "请求停止失败")
      if (token !== epoch.current) return
      const updated = payload.data as ClientTask
      setTask(updated)
      if (updated.state === "cancelled")
        toast.info("任务已停止，已完成产物已保留")
      else if (updated.state === "cancel_requested")
        toast.info("已请求停止，当前请求收尾中")
      else toast.info("任务已结束，请查看最终结果")
    } catch (e) {
      if (token === epoch.current)
        toast.error(e instanceof Error ? e.message : "请求停止失败")
    } finally {
      stopLock.current = false
      if (token === epoch.current) setStopping(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>分镜制作 · {episodeTitle}</DialogTitle>
          <DialogDescription>
            先拆分与校验，再生成资产和视频。已有镜头会在拆分成功后替换，失败时保留。
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (!running) setTab(value as Mode)
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            {[
              ["text", "仅拆分镜"],
              ["image", "出图"],
              ["video", "出视频"],
              ["bgm", "后期 BGM"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value!} disabled={running}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="text-sm text-zinc-400">
          {tab === "bgm" ? "音频模型" : "拆分文本模型"}
        </label>
        <div className={running ? "pointer-events-none opacity-60" : ""}>
          <CardSelect
            value={model}
            onValueChange={(value) => {
              if (!running) setModel(value)
            }}
            options={models.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </div>
        {modelsError && (
          <p role="alert" className="text-xs text-orange-300">
            {modelsError}
          </p>
        )}
        {tab === "bgm" ? (
          <textarea
            aria-label="配乐要求"
            value={prompt}
            disabled={running}
            onChange={(e) => setPrompt(e.target.value)}
            className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm"
          />
        ) : (
          <p className="text-sm leading-6 text-zinc-400">
            {tab === "image"
              ? "拆分后在段资产中配置图片模型和参数。"
              : tab === "video"
                ? "拆分后校验并确认引用，在当前页面进入视频阶段。"
                : "只提取镜组和镜头，不自动出图或视频。"}
          </p>
        )}
        {running && (
          <RequestPending
            label={
              task?.state === "cancel_requested"
                ? "已请求停止，当前请求收尾中"
                : "请求处理中"
            }
          />
        )}
        <div className="flex justify-end gap-2">
          {task &&
            ["queued", "running", "cancel_requested"].includes(task.state) && (
              <Button
                variant="outline"
                disabled={stopping || task.state === "cancel_requested"}
                onClick={() => void stop()}
              >
                {stopping && <Loader2 className="animate-spin" />}
                {task.state === "cancel_requested"
                  ? "等待停止确认"
                  : "请求停止"}
              </Button>
            )}
          <Button
            variant="inverse"
            disabled={running || !model || modelsLoading || !!modelsError}
            onClick={() => void run()}
          >
            开始
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
