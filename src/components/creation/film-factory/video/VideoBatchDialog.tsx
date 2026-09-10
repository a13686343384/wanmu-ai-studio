"use client"

import { useState } from "react"
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
import { DURATIONS, RESOLUTIONS, VIDEO_MODELS } from "@/lib/constants"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

const NEGATIVE_PRESETS = ["低清晰度", "畸形", "文字水印", "logo", "镜头抖动", "人脸变形", "过曝"]

/**
 * 分集级「出视频」批量弹窗。
 * 一次性把本集所有镜头排队生成视频，并展示整体进度与逐镜状态。
 */
export function VideoBatchDialog({
  open,
  onOpenChange,
  episodeTitle,
  storyboards,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeTitle: string
  storyboards: StoryboardDTO[]
  onDone: () => void
}) {
  const [model, setModel] = useState(VIDEO_MODELS[0]!.id)
  const [resolution, setResolution] = useState("1080p")
  const [duration, setDuration] = useState("5s")
  const [skipImage, setSkipImage] = useState(false)
  const [negative, setNegative] = useState("低清晰度，文字水印，畸形")
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(0)
  const [label, setLabel] = useState("")

  const pending = storyboards.filter((item) => !item.videoUrl)

  async function run() {
    if (storyboards.length === 0) {
      toast.error("请先拆分镜")
      return
    }

    setRunning(true)
    setDone(0)
    setProgress(2)
    setLabel("准备生成队列…")

    let succeeded = 0
    let failed = 0

    for (let index = 0; index < storyboards.length; index++) {
      const storyboard = storyboards[index]!
      setLabel(`正在生成分镜 ${storyboard.number}（${index + 1}/${storyboards.length}）`)
      setProgress(Math.round((index / storyboards.length) * 96) + 2)

      try {
        const res = await fetch(`/api/storyboards/${storyboard.id}/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: "video",
            model,
            prompt: "按分镜描述生成",
            negativePrompt: negative || undefined,
            aspectRatio: "9:16",
            resolution,
            duration,
            skipStoryboardImage: skipImage,
          }),
        })
        if (!res.ok) throw new Error("生成失败")
        succeeded++
      } catch {
        failed++
      }

      setDone(index + 1)
    }

    setProgress(100)
    setLabel(failed === 0 ? "全部完成" : `完成，${failed} 个失败`)

    if (failed === 0) {
      toast.success("视频已全部生成", { description: `共 ${succeeded} 个镜头` })
    } else {
      toast.warning("部分镜头生成失败", { description: `成功 ${succeeded} · 失败 ${failed}` })
    }

    onDone()
    window.setTimeout(() => {
      setRunning(false)
      setProgress(0)
      setDone(0)
      setLabel("")
      onOpenChange(false)
    }, 900)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !running && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-rose-400" />
            出视频 · {episodeTitle}
          </DialogTitle>
          <DialogDescription>
            本集共 {storyboards.length} 个镜头，其中 {pending.length} 个尚未出视频。将按顺序逐个生成。
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
                  {VIDEO_MODELS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.cost} 积分
                    </SelectItem>
                  ))}
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
              options={DURATIONS.map((d) => ({ value: d, label: d }))}
              value={duration}
              onChange={setDuration}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
            <div>
              <p className="text-xs text-zinc-200">免分镜图直出</p>
              <p className="text-[11px] text-zinc-500">跳过静帧直接出视频，节省积分</p>
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

          {running && (
            <VideoProgressBar
              progress={progress}
              label={label}
              done={done}
              total={storyboards.length}
            />
          )}

          {!running && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
              预计消耗 {VIDEO_MODELS.find((m) => m.id === model)?.cost ?? 0} 积分/镜 ×{" "}
              {storyboards.length} 镜 ≈{" "}
              <Badge variant="brand" className="font-normal">
                {(VIDEO_MODELS.find((m) => m.id === model)?.cost ?? 0) * storyboards.length} 积分
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            取消
          </Button>
          <Button variant="brand" onClick={() => void run()} disabled={running || storyboards.length === 0}>
            {running ? <Loader2 className="animate-spin" /> : <Video />}
            开始出视频
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
