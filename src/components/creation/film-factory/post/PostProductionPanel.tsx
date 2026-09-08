"use client"

import { useState } from "react"
import { Download, Film, Loader2, Music, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AudioGenerator } from "@/components/creation/film-factory/post/AudioGenerator"
import { BGMSelector } from "@/components/creation/film-factory/post/BGMSelector"
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
  const [bgmStyle, setBgmStyle] = useState<string | null>(null)
  const [audio, setAudio] = useState<string | null>(audioUrl)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const withVideo = storyboards.filter((item) => item.videoUrl)
  const ready = withVideo.length > 0

  async function exportFilm() {
    if (!ready) {
      toast.error("还没有可合成的视频片段")
      return
    }

    setExporting(true)
    setExportProgress(6)
    const timer = window.setInterval(() => {
      setExportProgress((value) => (value >= 94 ? value : value + 6 + Math.random() * 9))
    }, 420)

    // 模拟合成流水线：拼接 → 混音 → 编码
    await new Promise((resolve) => setTimeout(resolve, 3200))

    window.clearInterval(timer)
    setExportProgress(100)
    setExporting(false)
    toast.success("成片已导出", {
      description: `${episodeTitle} · ${withVideo.length} 个镜头已合成`,
    })
    onRefresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            后期合成 · {episodeTitle}
          </SheetTitle>
          <SheetDescription>
            汇总本集视频片段与音频轨，完成混音后导出成片。
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          {/* 视频轨 */}
          <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-rose-400" />
              <h3 className="text-xs font-medium text-zinc-200">视频轨</h3>
              <Badge variant={ready ? "success" : "muted"} className="ml-auto font-normal">
                {withVideo.length}/{storyboards.length} 片段就绪
              </Badge>
            </div>

            {ready ? (
              <div className="grid grid-cols-2 gap-2">
                {withVideo.slice(0, 4).map((item) => (
                  <VideoPreview
                    key={item.id}
                    src={item.videoUrl}
                    poster={item.imageUrl}
                    className="h-20"
                  />
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
              <h3 className="text-xs font-medium text-zinc-200">配音 / BGM 轨</h3>
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

          <BGMSelector value={bgmStyle} onChange={setBgmStyle} />

          {/* 导出 */}
          <section className="space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <h3 className="text-xs font-medium text-zinc-200">合成导出</h3>

            {exporting && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-orange-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    正在拼接与混音…
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    {Math.round(exportProgress)}%
                  </span>
                </div>
                <Progress value={exportProgress} indicatorClassName="bg-orange-500" />
              </div>
            )}

            <Button
              variant="brand"
              className="w-full"
              onClick={() => void exportFilm()}
              disabled={exporting || !ready}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              导出成片
            </Button>

            <p className="text-[10px] leading-relaxed text-zinc-600">
              导出会按时间线拼接视频片段，叠加配音与 BGM，输出 {withVideo.length || 0} 段 · 约{" "}
              {storyboards.reduce((sum, item) => sum + (item.duration ?? 3), 0)} 秒的成片。
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
