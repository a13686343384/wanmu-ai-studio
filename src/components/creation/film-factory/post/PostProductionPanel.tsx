"use client"

import { useEffect, useState } from "react"
import { Download, Film, Music, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AudioGenerator } from "@/components/creation/film-factory/post/AudioGenerator"
import { VideoPreview } from "@/components/creation/film-factory/video/VideoPreview"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

/**
 * 后期合成面板。
 * 汇总本集视频轨、配音/BGM 轨与混音导出。
 */
export function PostProductionPanel({
  open,
  onOpenChange,
  scriptId,
  episodeId,
  episodeTitle,
  storyboards,
  audioUrl,
  onRefresh,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptId: string
  episodeId: string
  episodeTitle: string
  storyboards: StoryboardDTO[]
  audioUrl: string | null
  onRefresh: () => void
}) {
  const [audio, setAudio] = useState<string | null>(audioUrl)
  useEffect(() => {
    setAudio(audioUrl)
  }, [audioUrl, episodeId])

  const withVideo = storyboards.filter(
    (item) => item.videoUrl && !item.videoUrl.startsWith("data:image"),
  )
  const ready = withVideo.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            后期合成 · {episodeTitle}
          </SheetTitle>
          <SheetDescription>
            预览和下载已有视频片段与音频。成片拼接及混音尚未接入。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {/* 视频轨 */}
          <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-rose-400" />
              <h3 className="text-xs font-medium text-zinc-200">视频轨</h3>
              <Badge
                variant={ready ? "success" : "muted"}
                className="ml-auto font-normal"
              >
                {withVideo.length}/{storyboards.length} 片段就绪
              </Badge>
            </div>

            {ready ? (
              <div className="grid grid-cols-2 gap-2">
                {withVideo.map((item) => (
                  <div key={item.id} className="min-w-0 space-y-1.5">
                    <VideoPreview
                      src={item.videoUrl}
                      poster={item.imageUrl}
                      className="h-20"
                    />
                    <a
                      href={item.videoUrl!}
                      download={`镜头-${item.number}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-orange-400 hover:underline"
                    >
                      <Download className="h-3 w-3" />
                      下载镜头 {item.number}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[11px] text-zinc-600">
                还没有生成的视频片段，先去「拆分镜 → 出视频」
              </p>
            )}
          </section>

          {/* 音频轨 */}
          <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <div className="flex items-center gap-2">
              <Music className="h-3.5 w-3.5 text-violet-400" />
              <h3 className="text-xs font-medium text-zinc-200">
                配音 / BGM 轨
              </h3>
            </div>

            {audio ? (
              <audio src={audio} controls className="w-full" />
            ) : (
              <p className="text-[11px] text-zinc-600">尚未生成音频轨道</p>
            )}
          </section>

          <AudioGenerator
            scriptId={scriptId}
            episodeId={episodeId}
            onGenerated={(url) => {
              setAudio(url)
              onRefresh()
            }}
          />

          {/* 导出 */}
          <section className="space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <h3 className="text-xs font-medium text-zinc-200">合成导出</h3>

            <p className="text-sm text-zinc-300">合成功能暂不可用</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              尚未接入视频拼接、混音和编码服务。可下载上方已有片段，在剪辑软件中完成后期。
            </p>
            <Button variant="brand" className="w-full" disabled>
              <Download />
              导出成片
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
