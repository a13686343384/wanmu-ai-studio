"use client"

import { useEffect, useState } from "react"
import { Ban, Coins, ImageIcon, Loader2, TriangleAlert, Video } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { ASPECT_RATIOS, DURATIONS, IMAGE_MODELS, TEXT_MODELS, VIDEO_MODELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
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

type VideoMode = "storyboard" | "direct"

/**
 * 分镜产物生成弹窗（出图 / 出视频）。
 * 出视频按设计稿提供「分镜驱动 / 直出·免分镜图」两种方式与生成方式、清晰度档位。
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
  const [textModel, setTextModel] = useState(TEXT_MODELS[0]!.id)
  const [videoMode, setVideoMode] = useState<VideoMode>("storyboard")
  const [genStyle, setGenStyle] = useState("first-frame")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [resolution, setResolution] = useState(kind === "image" ? "1K" : "480p")
  const [duration, setDuration] = useState("5s")
  const [prompt, setPrompt] = useState("")
  const [negative, setNegative] = useState("")
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) return
    setModel(kind === "image" ? "man-image-v2-lite" : VIDEO_MODELS[0]!.id)
    setResolution(kind === "image" ? "1K" : "480p")
    setPrompt(storyboard?.prompt ?? "")
    setNegative(storyboard?.negativePrompt ?? "")
    setVideoMode("storyboard")
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
          skipStoryboardImage: kind === "video" && videoMode === "direct",
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
  const videoModelCost = VIDEO_MODELS[0]?.cost ?? 120

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
            {kind === "image" ? (
              "生成分镜图"
            ) : (
              <span>生成这段视频{storyboard ? ` · ${storyboard.shotType}：${storyboard.description.slice(0, 10)}` : ""}</span>
            )}
            {kind === "image" && storyboard && (
              <Badge variant="muted" className="font-normal">
                分镜 #{storyboard.number}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {kind === "image"
              ? "按分镜描述生成静帧，可作为出视频的首帧参考。"
              : "选视频模型与参数，然后出这一段的视频。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {kind === "video" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">文本模型（撰写本段视频提示词）</Label>
              <Select value={textModel} onValueChange={setTextModel}>
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
          )}

          {kind === "video" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">出视频方式</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: "storyboard",
                      title: "分镜驱动",
                      description: "先出/复用分镜图，再以它为首帧出视频（已出的复用）",
                    },
                    {
                      value: "direct",
                      title: "直出·免分镜图",
                      description: "跳过分镜图直接按角色/场景参考图出视频帧",
                    },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVideoMode(option.value)}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-colors",
                      videoMode === option.value
                        ? "border-zinc-400 bg-zinc-800"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600",
                    )}
                  >
                    <span className="block text-xs font-medium text-zinc-100">{option.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">
              {kind === "image" ? "模型" : "生视频模型"}
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-9 w-full text-xs">
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

          {kind === "video" && (
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-500">生成方式</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "first-frame", label: "首镜帧" },
                    { value: "reference", label: "参考" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGenStyle(option.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                        genStyle === option.value
                          ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                          : "border-zinc-800 text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-zinc-500">清晰度</p>
                <OptionPills
                  options={[
                    { value: "480p", label: "480p" },
                    { value: "720p", label: "720p" },
                  ]}
                  value={resolution}
                  onChange={setResolution}
                />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-zinc-500">时长</p>
                <OptionPills
                  options={DURATIONS.map((d) => ({ value: d, label: d }))}
                  value={duration}
                  onChange={setDuration}
                />
              </div>

              <p className="text-[10px] leading-relaxed text-zinc-600">
                提示：视频时长由 AI 按剧本时段情绪节点决定，模式/剧情不同，单段长度也不同；
                如需统一，可在单集编辑器里调整。
              </p>
              <p className="flex items-center gap-1 text-[11px] text-amber-300">
                <Coins className="h-3 w-3" />
                预计消耗约 {videoModelCost} 爆米花 · 视频时长会浮动
              </p>
            </div>
          )}

          {kind === "image" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">画幅</Label>
              <OptionPills
                options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.value }))}
                value={aspectRatio}
                onChange={setAspectRatio}
              />
            </div>
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
              视频禁止项 · 反向提示词
            </Label>
            <Input
              value={negative}
              onChange={(event) => setNegative(event.target.value)}
              placeholder="统一写「不要什么」，一行一条：不要背景音乐 / BGM…"
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
                            .split(/[,，\n]/)
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

          {kind === "video" && (
            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-[11px] leading-relaxed text-amber-300/90">
              <p className="flex items-center gap-1 font-medium">
                <TriangleAlert className="h-3 w-3" />
                预计总用量 s：{Number.parseInt(duration) * 24 || 120}
              </p>
              <p className="text-amber-400/70">
                本段视频 1 条，共 {duration} s；约 {videoModelCost}。
                提示词本段按剧本自动编写，参照分镜/首帧、视频参与片段结构互覆写。
                数值仅预估，实际消耗按时长结算。
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>
            取消
          </Button>
          <Button variant="inverse" onClick={() => void run()} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Video className={kind === "image" ? "hidden" : undefined} />}
            {kind === "image" ? "开始生成" : "生成视频"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
