"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { LayoutGrid, Sparkles, Video } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScriptDetailHeader } from "@/components/creation/film-factory/detail/ScriptDetailHeader"
import { WorkflowTabs } from "@/components/creation/film-factory/detail/WorkflowTabs"
import { EpisodeList } from "@/components/creation/film-factory/detail/EpisodeList"
import { ScriptContent } from "@/components/creation/film-factory/detail/ScriptContent"
import { AssetSidebar } from "@/components/creation/film-factory/detail/AssetSidebar"
import { StoryboardSection } from "@/components/creation/film-factory/detail/StoryboardSection"
import { SplitStoryboardDialog } from "@/components/creation/film-factory/detail/SplitStoryboardDialog"
import { StoryboardEditor } from "@/components/creation/film-factory/detail/StoryboardEditor"
import { StoryboardGenerateDialog } from "@/components/creation/film-factory/detail/StoryboardGenerateDialog"
import { ConsultDialog } from "@/components/creation/film-factory/detail/ConsultDialog"
import { RecapDialog, type RecapResult } from "@/components/creation/film-factory/detail/RecapDialog"
import { VideoBatchDialog } from "@/components/creation/film-factory/video/VideoBatchDialog"
import { PostProductionPanel } from "@/components/creation/film-factory/post/PostProductionPanel"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"
import type { ScriptDetail } from "@/lib/serializers/script"

/**
 * 剧本详情页主视图。
 * 三栏布局：分集列表 / 剧本内容 + 分镜 / 资产侧边栏。
 * 负责协调会诊、复述理解、拆分镜与分镜产物生成等全部交互。
 */
export function ScriptDetailView({ initialScript }: { initialScript: ScriptDetail }) {
  const [script, setScript] = useState(initialScript)
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(
    initialScript.episodes[0]?.id ?? null,
  )

  const [storyboards, setStoryboards] = useState<StoryboardDTO[]>([])
  const [storyboardsLoading, setStoryboardsLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")

  const [splitOpen, setSplitOpen] = useState(false)
  const [consultOpen, setConsultOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [recapResult, setRecapResult] = useState<RecapResult | null>(null)
  const [editing, setEditing] = useState<StoryboardDTO | null>(null)
  const [generateTarget, setGenerateTarget] = useState<{
    storyboard: StoryboardDTO
    kind: "image" | "video"
  } | null>(null)
  const [videoBatchOpen, setVideoBatchOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)

  const activeEpisode = script.episodes.find((e) => e.id === activeEpisodeId) ?? null

  /* ---------------------------- 数据加载 ---------------------------- */

  const reloadScript = useCallback(async () => {
    try {
      const res = await fetch(`/api/scripts/${script.id}`)
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "刷新失败")
      setScript(payload.data as ScriptDetail)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败")
    }
  }, [script.id])

  const loadStoryboards = useCallback(async () => {
    if (!activeEpisodeId) {
      setStoryboards([])
      return
    }
    setStoryboardsLoading(true)
    try {
      const res = await fetch(
        `/api/scripts/${script.id}/episodes/${activeEpisodeId}/storyboards`,
      )
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "加载分镜失败")
      setStoryboards(payload.data.storyboards ?? [])
    } catch {
      setStoryboards([])
    } finally {
      setStoryboardsLoading(false)
    }
  }, [script.id, activeEpisodeId])

  useEffect(() => {
    void loadStoryboards()
  }, [loadStoryboards])

  /* ---------------------------- 交互 ---------------------------- */

  async function generateForStoryboard(storyboard: StoryboardDTO, kind: "image" | "video") {
    setBusyId(storyboard.id)
    try {
      const res = await fetch(`/api/storyboards/${storyboard.id}/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          model: kind === "image" ? "man-image-v2-lite" : "seedance-2.0",
          prompt: "按分镜描述生成",
          negativePrompt: storyboard.negativePrompt ?? undefined,
          aspectRatio: script.targetAspect,
          resolution: kind === "image" ? "1K" : "1080p",
          duration: "5s",
          skipStoryboardImage: false,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      toast.success(kind === "image" ? "分镜图已生成" : "视频已生成")
      await loadStoryboards()
      await reloadScript()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setBusyId(null)
    }
  }

  async function generateCover() {
    toast.info("生成封面", { description: "将按题材与视觉风格生成剧集封面" })
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "image",
          prompt: `${script.genre ?? ""} ${script.visualStyle ?? ""} 剧集封面，${script.title}`,
          modelId: "man-image-v2-lite",
          aspectRatio: script.targetAspect,
          resolution: "1K",
          duration: "5s",
          count: 1,
          references: [],
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")
      toast.success("封面已生成", { description: "已保存到项目资产" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    }
  }

  const totalAssets =
    script.characters.length + script.scenes.length + script.props.length

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <ScriptDetailHeader
        script={script}
        onConsult={() => setConsultOpen(true)}
        onGenerateCover={() => void generateCover()}
      />

      <WorkflowTabs
        status={script.status}
        processing={script.processingStatus}
        counts={{ episodes: script.episodes.length, assets: totalAssets, storyboards: storyboards.length }}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* 左：分集列表 */}
        <aside className="hidden min-h-0 border-r border-zinc-800/80 bg-zinc-950/40 lg:block">
          <EpisodeList
            episodes={script.episodes}
            activeId={activeEpisodeId}
            onSelect={setActiveEpisodeId}
          />
        </aside>

        {/* 中：剧本内容 + 分镜 */}
        <main className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-h-0 border-b border-zinc-800/80">
            <ScriptContent episode={activeEpisode} onSaved={() => void reloadScript()} />
          </section>
          <section className="min-h-0">
            <StoryboardSection
              storyboards={storyboards}
              loading={storyboardsLoading}
              busyId={busyId}
              generating={generating}
              progress={progress}
              progressLabel={progressLabel}
              hasEpisode={Boolean(activeEpisode)}
              onSplit={() => setSplitOpen(true)}
              onRecap={() => {
                setRecapResult(null)
                setRecapOpen(true)
              }}
              onGenerateImage={(storyboard) =>
                setGenerateTarget({ storyboard, kind: "image" })
              }
              onGenerateVideo={(storyboard) =>
                setGenerateTarget({ storyboard, kind: "video" })
              }
              onEdit={setEditing}
            />
          </section>
        </main>

        {/* 右：资产侧边栏 */}
        <aside className="hidden min-h-0 border-l border-zinc-800/80 bg-zinc-950/40 lg:block">
          <AssetSidebar
            scriptId={script.id}
            characters={script.characters}
            scenes={script.scenes}
            props={script.props}
            onRefresh={() => void reloadScript()}
          />
        </aside>
      </div>

      {/* 底部状态条 */}
      <div className="flex items-center gap-3 border-t border-zinc-800/80 bg-zinc-950 px-4 py-2 text-[11px] text-zinc-500">
        <span>单集时长 {script.episodeDuration}s</span>
        <span className="text-zinc-700">·</span>
        <span>单集风格：{activeEpisode?.style ?? "跟随全剧"}</span>
        <span className="text-zinc-700">·</span>
        <span>目标画幅 {script.targetAspect}</span>
        <span>
          {script.processingStatus === "processing" ? (
            <span className="text-amber-400">{script.progressLabel ?? "处理中"}</span>
          ) : (
            <span className="text-emerald-400">{script.progressLabel ?? "就绪"}</span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setVideoBatchOpen(true)}
            disabled={storyboards.length === 0}
          >
            <Video className="h-3.5 w-3.5" />
            下一步 · 出视频
          </Button>
          <Button variant="outline" size="sm" className="h-7" onClick={() => setPostOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" />
            后期合成
          </Button>
          <Button variant="ghost" size="sm" className="h-7" asChild>
            <Link href="/canvas">
              <LayoutGrid className="h-3.5 w-3.5" />
              打通到画布
            </Link>
          </Button>
        </div>
      </div>

      {/* 弹窗与抽屉 */}
      {activeEpisode && (
        <>
          <SplitStoryboardDialog
            open={splitOpen}
            onOpenChange={setSplitOpen}
            scriptId={script.id}
            episodeId={activeEpisode.id}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            onDone={() => {
              void loadStoryboards()
              void reloadScript()
            }}
          />

          <RecapDialog
            open={recapOpen}
            onOpenChange={setRecapOpen}
            scriptId={script.id}
            episodeId={activeEpisode.id}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            result={recapResult}
            onLoaded={setRecapResult}
          />
        </>
      )}

      <ConsultDialog
        open={consultOpen}
        onOpenChange={setConsultOpen}
        scriptId={script.id}
        consultation={script.consultations[0] ?? null}
        onRefresh={() => void reloadScript()}
      />

      <StoryboardEditor
        storyboard={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => void loadStoryboards()}
      />

      <StoryboardGenerateDialog
        storyboard={generateTarget?.storyboard ?? null}
        kind={generateTarget?.kind ?? "image"}
        open={Boolean(generateTarget)}
        onOpenChange={(open) => !open && setGenerateTarget(null)}
        onDone={() => {
          void loadStoryboards()
          void reloadScript()
        }}
      />

      {activeEpisode && (
        <>
          <VideoBatchDialog
            open={videoBatchOpen}
            onOpenChange={setVideoBatchOpen}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            storyboards={storyboards}
            onDone={() => {
              void loadStoryboards()
              void reloadScript()
            }}
          />

          <PostProductionPanel
            open={postOpen}
            onOpenChange={setPostOpen}
            scriptId={script.id}
            episodeId={activeEpisode.id}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            storyboards={storyboards}
            audioUrl={activeEpisode.audioUrl}
            onRefresh={() => void reloadScript()}
          />
        </>
      )}
    </div>
  )
}
