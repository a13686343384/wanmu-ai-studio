"use client"

import { useEffect, useState } from "react"
import { Ban, ImageIcon, Loader2, Video } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { ASPECT_RATIOS, DURATIONS, IMAGE_MODELS, RESOLUTIONS, VIDEO_MODELS } from "@/lib/constants"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

/** 视频禁止项快捷标签。 */
const NEGATIVE_PRESETS = [
  "低清晰度",
  "画面模糊",
  "多余手指",
  "畸形肢体",
  "文字水印",
  "logo",
  "过曝",
  "镜头抖动",
  "人脸变形",
  "低质量",
]

/**
 * 分镜产物生成弹窗（出图 / 出视频）。
 * 包含模型、画幅、分辨率、时长、正向与反向提示词（禁止项）。
 */
export function StoryboardGenerateDialog({
  storyboard,
  kind,
  open,
  onOpenChange,
  onDone,
}: {
  storyboard: StoryboardDTO | null
  kind: "image" | "video"
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [model, setModel] = useState(kind === "image" ? "man-image-v2-lite" : VIDEO_MODELS[0]!.id)
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [resolution, setResolution] = useState(kind === "image" ? "1K" : "1080p")
  const [duration, setDuration] = useState("5s")
  const [skipImage, setSkipImage] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [negative, setNegative] = useState("")
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) return
    setModel(kind === "image" ? "man-image-v2-lite" : VIDEO_MODELS[0]!.id)
    setResolution(kind === "image" ? "1K" : "1080p")
    setPrompt(storyboard?.prompt ?? "")
    setNegative(storyboard?.negativePrompt ?? "")
    setSkipImage(false)
  }, [open, kind, storyboard])

  async function run() {
    if (!storyboard) return
    setRunning(true)
    try {
      const res = await fetch(`/api/storyboards/${storyboard.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          model,
          prompt: prompt || "按分镜描述生成",
          negativePrompt: negative || undefined,
          aspectRatio,
          resolution,
          duration,
          skipStoryboardImage: skipImage,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      toast.success(kind === "image" ? "分镜图已生成" : "视频已生成")
      onDone()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setRunning(false)
    }
  }

  const models = kind === "image" ? IMAGE_MODELS : VIDEO_MODELS

  return (
    <Dialog open={open} onOpenChange={(value) => !running && onOpenChange(value)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "image" ? (
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            ) : (
              <Video className="h-4 w-4 text-rose-400" />
            )}
            {kind === "image" ? "生成分镜图" : "生成视频"}
            {storyboard && (
              <Badge variant="muted" className="font-normal">
                分镜 #{storyboard.number}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {kind === "image"
              ? "按分镜描述生成静帧，可作为出视频的首帧参考。"
              : "按分镜描述生成视频片段，可开启「免分镜图直出」跳过静帧。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((item) => (
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
            <Label className="text-[11px] text-zinc-400">画幅</Label>
            <OptionPills
              options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.value }))}
              value={aspectRatio}
              onChange={setAspectRatio}
            />
          </div>

          {kind === "video" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-zinc-400">时长</Label>
                <OptionPills
                  options={DURATIONS.map((d) => ({ value: d, label: d }))}
                  value={duration}
                  onChange={setDuration}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                <div>
                  <p className="text-xs text-zinc-200">免分镜图直出</p>
                  <p className="text-[11px] text-zinc-500">跳过静帧，直接生成视频</p>
                </div>
                <Switch checked={skipImage} onCheckedChange={setSkipImage} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">补充提示词（可选）</Label>
            <Textarea
              rows={2}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="追加到镜头描述之后，例如：雨夜、霓虹、浅景深"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Ban className="h-3 w-3 text-rose-400" />
              反向提示词 · 禁止项
            </Label>
            <Input
              value={negative}
              onChange={(event) => setNegative(event.target.value)}
              placeholder="不希望出现的元素"
              className="h-8 text-xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {NEGATIVE_PRESETS.map((preset) => {
                const active = negative.includes(preset)
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setNegative((current) => {
                        if (current.includes(preset)) {
                          return current
                            .split(/[,，]/)
                            .map((part) => part.trim())
                            .filter((part) => part && part !== preset)
                            .join("，")
                        }
                        return current ? `${current}，${preset}` : preset
                      })
                    }
                    className={
                      active
                        ? "rounded border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300"
                        : "rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
                    }
                  >
                    {preset}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            取消
          </Button>
          <Button variant="brand" onClick={() => void run()} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <ImageIcon />}
            开始生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
