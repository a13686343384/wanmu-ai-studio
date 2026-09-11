"use client"

import { useEffect, useState, useRef } from "react"
import { Ban, Loader2, Video } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { VideoProgressBar } from "@/components/creation/film-factory/video/VideoProgressBar"
import { startTask, type ClientTask } from "@/lib/tasks/client"
import { DURATIONS, RESOLUTIONS } from "@/lib/constants"
import { useAiModels } from "@/hooks/useAiModels"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

const NEGATIVE_PRESETS = ["低清晰度", "畸形", "文字水印", "logo", "镜头抖动", "人脸变形", "过曝"]

/**
 * 分集级「出视频」批量弹窗。
 * 一次性把本集所有镜头排队生成视频，并展示整体进度与逐镜状态。
 */
export function VideoBatchDialog({
  open,
  onOpenChange,
  episodeTitle, scriptId, episodeId, aspectRatio,
  storyboards,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeTitle: string
  scriptId: string
  episodeId: string
  aspectRatio: string
  storyboards: StoryboardDTO[]
  onDone: () => void
}) {
  const { models: videoModels } = useAiModels("video")
  const [model, setModel] = useState("")

  useEffect(() => {
    if (videoModels.length > 0 && !videoModels.some(m => m.id === model)) setModel(videoModels[0]!.id)
  }, [videoModels, model])
  const [resolution, setResolution] = useState("1080p")
  const [duration, setDuration] = useState("source")
  const [skipImage, setSkipImage] = useState(false)
  const [negative, setNegative] = useState("低清晰度，文字水印，畸形")
  const [running, setRunning] = useState(false)
  const [task, setTask] = useState<ClientTask | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const pending = storyboards.filter(item => !item.videoUrl || item.generationParams?.videoStale || item.generationParams?.outputsStale)
  async function run() {
    if (!pending.length || !model || running) return
    setRunning(true)
    setTask(null)
    try {
      const result = await startTask({kind:'video_batch',scriptId,episodeId,body:{model,negativePrompt:negative||undefined,aspectRatio,resolution,duration:duration==='source'?undefined:duration,skipStoryboardImage:skipImage}}, current => { if (mounted.current) setTask(current) })
      if (mounted.current) { toast.success(`视频生成完成 ${result.completed} 个镜头`); onDone() }
    } catch (error) {
      if (mounted.current) { toast.error(error instanceof Error ? error.message : '视频生成失败'); onDone() }
    } finally { if (mounted.current) setRunning(false) }
  }
  async function stop() {
    if (!task) return
    try {
      const response = await fetch(`/api/tasks/${task.id}`,{method:'PATCH'})
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? '停止请求失败')
      setTask(payload.data)
      toast.info(payload.data.state==='cancelled'?'任务已停止':'已请求停止，当前请求收尾中')
    } catch(error) { toast.error(error instanceof Error ? error.message : '停止请求失败') }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !running && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-rose-400" />
            出视频 · {episodeTitle}
          </DialogTitle>
          <DialogDescription>
            本集共 {storyboards.length} 个镜头，其中 {pending.length} 个待生成或更新。将按顺序逐个生成。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">视频模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {videoModels.length > 0 ? videoModels.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.cost} 积分
                    </SelectItem>
                  )) : <SelectItem value="no-model" disabled>暂无可用模型，请到「AI 设置」配置</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">分辨率</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">单镜时长</Label>
            <OptionPills
              options={[{ value: "source", label: "按分镜时长" }, ...DURATIONS.map((d) => ({ value: d, label: d }))]}
              value={duration}
              onChange={setDuration}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
            <div>
              <p className="text-xs text-zinc-200">免分镜图直出</p>
              <p className="text-[11px] text-zinc-500">仅对支持纯文本生成的模型生效</p>
            </div>
            <Switch checked={skipImage} onCheckedChange={setSkipImage} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Ban className="h-3 w-3 text-rose-400" />
              反向提示词 · 视频禁止项
            </Label>
            <Input
              value={negative}
              onChange={(event) => setNegative(event.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {NEGATIVE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setNegative((current) =>
                      current.includes(preset)
                        ? current
                            .split(/[,，]/)
                            .map((p) => p.trim())
                            .filter((p) => p && p !== preset)
                            .join("，")
                        : current
                          ? `${current}，${preset}`
                          : preset,
                    )
                  }
                  className={
                    negative.includes(preset)
                      ? "rounded border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300"
                      : "rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {task && <div className="space-y-2">
            <VideoProgressBar progress={task.total ? Math.round((task.completed + task.failed) / task.total * 100) : 0} label={task.currentLabel} done={task.completed} total={task.total ?? pending.length} />
            <p className="text-xs text-zinc-400">成功 {task.completed} · 失败 {task.failed}{task.error ? ` · ${task.error}` : ''}</p>
            {['running','queued','cancel_requested'].includes(task.state) && <Button variant="outline" size="sm" disabled={task.state==='cancel_requested'} onClick={() => void stop()}>{task.state==='cancel_requested'?'停止收尾中':'停止任务'}</Button>}
          </div>}

          {!running && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
              配置参考费用（非结算账单）： {videoModels.find((m) => m.id === model)?.cost ?? 0} 积分/镜 ×{" "}
              {pending.length} 镜 ≈{" "}
              <Badge variant="brand" className="font-normal">
                {(videoModels.find((m) => m.id === model)?.cost ?? 0) * pending.length} 积分
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            取消
          </Button>
          <Button variant="brand" onClick={() => void run()} disabled={running || pending.length === 0 || !model}>
            {running ? <Loader2 className="animate-spin" /> : <Video />}
            开始出视频
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
