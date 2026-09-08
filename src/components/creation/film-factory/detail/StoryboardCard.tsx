"use client"

import { useState } from "react"
import { Clapperboard, ImageIcon, Loader2, Pencil, Play, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface StoryboardDTO {
  id: string
  number: number
  shotType: string
  description: string
  dialogue: string | null
  action: string | null
  camera: string | null
  duration: number | null
  imageUrl: string | null
  videoUrl: string | null
  audioUrl: string | null
  prompt: string | null
  negativePrompt: string | null
  model: string | null
  status: string
}

/**
 * 分镜卡片。
 * 展示镜号 / 镜头类型 / 画面 / 描述 / 台词 / 运镜，
 * 并提供生成分镜图、出视频、编辑三个入口。
 */
export function StoryboardCard({
  storyboard,
  busy,
  onGenerateImage,
  onGenerateVideo,
  onEdit,
}: {
  storyboard: StoryboardDTO
  busy: boolean
  onGenerateImage: (storyboard: StoryboardDTO) => void
  onGenerateVideo: (storyboard: StoryboardDTO) => void
  onEdit: (storyboard: StoryboardDTO) => void
}) {
  const [previewVideo, setPreviewVideo] = useState(false)
  const hasVideo = Boolean(storyboard.videoUrl)

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-xl border bg-zinc-900/50 transition-colors",
        storyboard.status === "generating"
          ? "border-amber-500/50"
          : storyboard.status === "failed"
            ? "border-rose-500/50"
            : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      {/* 画面 */}
      <div className="relative aspect-video overflow-hidden bg-zinc-950">
        {storyboard.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storyboard.imageUrl}
              alt={`分镜 ${storyboard.number}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setPreviewVideo(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="预览"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-900">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-zinc-600">
            {storyboard.status === "generating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span className="text-[10px]">生成中…</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                <span className="text-[10px]">尚未出图</span>
              </>
            )}
          </div>
        )}

        <Badge
          variant="muted"
          className="absolute left-2 top-2 border-white/10 bg-black/55 text-[10px] backdrop-blur"
        >
          分镜 {storyboard.number}
        </Badge>
        <Badge
          variant="info"
          className="absolute right-2 top-2 border-white/10 bg-black/55 text-[10px] backdrop-blur"
        >
          {storyboard.shotType}
        </Badge>
        {hasVideo && (
          <Badge
            variant="brand"
            className="absolute bottom-2 left-2 border-white/10 bg-black/55 text-[10px] backdrop-blur"
          >
            <Video className="mr-0.5 h-2.5 w-2.5" />
            已出视频
          </Badge>
        )}
      </div>

      {/* 内容 */}
      <div className="space-y-1.5 p-2.5">
        <p className="line-clamp-3 text-[11px] leading-relaxed text-zinc-300">
          {storyboard.description}
        </p>

        {storyboard.dialogue && (
          <p className="rounded bg-zinc-950/60 px-1.5 py-1 text-[10px] leading-relaxed text-sky-300">
            {storyboard.dialogue}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-600">
          {storyboard.camera && (
            <span className="flex items-center gap-0.5">
              <Clapperboard className="h-2.5 w-2.5" />
              {storyboard.camera}
            </span>
          )}
          {storyboard.duration != null && <span>{storyboard.duration}s</span>}
          {storyboard.negativePrompt && (
            <span className="text-rose-400/70">含反向提示词</span>
          )}
        </div>

        {/* 操作 */}
        <div className="flex gap-1.5 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-[11px]"
            disabled={busy}
            onClick={() => onGenerateImage(storyboard)}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
            {storyboard.imageUrl ? "重出图" : "出图"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-[11px]"
            disabled={busy}
            onClick={() => onGenerateVideo(storyboard)}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
            出视频
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(storyboard)}
            aria-label="编辑分镜"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {previewVideo && storyboard.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-8"
          onClick={() => setPreviewVideo(false)}
        >
          <div className="max-h-full max-w-4xl overflow-hidden rounded-xl border border-zinc-800">
            {hasVideo ? (
              <video src={storyboard.videoUrl!} controls autoPlay className="max-h-[80vh]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storyboard.imageUrl} alt="" className="max-h-[80vh] object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
