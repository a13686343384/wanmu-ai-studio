"use client"

import { useEffect, useRef, useState } from "react"
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatDuration } from "@/lib/utils"

/**
 * 视频预览播放器。
 * 支持播放/暂停、进度拖拽、音量与全屏；无真实视频流时回退为封面展示。
 */
export function VideoPreview({
  src,
  poster,
  className,
  aspectRatio = "16:9",
  autoPlay = false,
}: {
  src: string | null
  poster?: string | null
  className?: string
  aspectRatio?: string
  autoPlay?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  const isImageFallback = !src || src.startsWith("data:image")

  if (isImageFallback) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950", className)}
        style={{ aspectRatio: aspectRatio.replace(":", "/") }}
      >
        {poster || src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster ?? src!} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            暂无视频
          </div>
        )}
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur">
          预览帧
        </span>
      </div>
    )
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-zinc-800 bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        className="h-full w-full"
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* 控制条 */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={togglePlay}
          className="text-white hover:bg-white/15"
          aria-label={playing ? "暂停" : "播放"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <span className="text-[10px] tabular-nums text-zinc-300">
          {formatDuration(current)} / {formatDuration(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(event) => {
            const video = videoRef.current
            if (!video) return
            video.currentTime = Number(event.target.value)
            setCurrent(Number(event.target.value))
          }}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-orange-500"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const video = videoRef.current
            if (!video) return
            video.muted = !video.muted
            setMuted(video.muted)
          }}
          className="text-white hover:bg-white/15"
          aria-label={muted ? "取消静音" : "静音"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void videoRef.current?.requestFullscreen()}
          className="text-white hover:bg-white/15"
          aria-label="全屏"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 中央播放按钮 */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="播放"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition-transform hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}
