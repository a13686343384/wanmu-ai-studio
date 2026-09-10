"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ListVideo, Package, Sparkles, Video, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AssetSetupDialog, type AssetSetup } from "./AssetSetupDialog"
import { ScriptDetailHeader } from "@/components/creation/film-factory/detail/ScriptDetailHeader"
import { WorkflowTabs } from "@/components/creation/film-factory/detail/WorkflowTabs"
import { EpisodeStrip } from "@/components/creation/film-factory/detail/EpisodeStrip"
import { EpisodeList } from "@/components/creation/film-factory/detail/EpisodeList"
import { ScriptContent } from "@/components/creation/film-factory/detail/ScriptContent"
import { AssetSidebar } from "@/components/creation/film-factory/detail/AssetSidebar"
import { StoryboardSection } from "@/components/creation/film-factory/detail/StoryboardSection"
import { SplitStoryboardDialog } from "@/components/creation/film-factory/detail/SplitStoryboardDialog"
import { StoryboardEditor } from "@/components/creation/film-factory/detail/StoryboardEditor"
import { StoryboardGenerateDialog } from "@/components/creation/film-factory/detail/StoryboardGenerateDialog"
import { ConsultDialog } from "@/components/creation/film-factory/detail/ConsultDialog"
import {
  RecapDialog,
  type RecapResult,
} from "@/components/creation/film-factory/detail/RecapDialog"
import { ScriptInfoDialog } from "@/components/creation/film-factory/detail/ScriptInfoDialog"
import {
  PacingProfileDialog,
  type PacingProfile,
} from "@/components/creation/film-factory/detail/PacingProfileDialog"
import { VideoBatchDialog } from "@/components/creation/film-factory/video/VideoBatchDialog"
import { PostProductionPanel } from "@/components/creation/film-factory/post/PostProductionPanel"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"
import type { ScriptDetail } from "@/lib/serializers/script"

/** 各阶段对应的「下一步」动作文案与触发器。 */
const NEXT_STEP_LABEL: Record<string, string> = {
  intake: "下一步 · 剧本大纲",
  outlining: "下一步 · 出人物/场景资产",
  assets: "下一步 · 出人物/场景资产",
  storyboarding: "下一步 · 出视频",
  video: "下一步 · 出视频",
  post_production: "下一步 · 后期合成",
}

/**
 * 剧本详情页主视图（沉浸式全屏布局，与设计稿一致）：
 * 顶部返回条 → 工作流步骤条 → 分集胶片条 → 剧本内容 | 分镜 左右分栏 → 右侧资产栏 → 底部状态条。
 * 负责协调会诊、复述理解、拆分镜与分镜产物生成等全部交互。
 */
export function ScriptDetailView({
  initialScript,
}: {
  initialScript: ScriptDetail
}) {
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

  const [assetSetupOpen, setAssetSetupOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitMode, setSplitMode] = useState<"text" | "image" | "video" | "bgm">("image")
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

  // 移动端（< lg）隐藏资产栏与内容分栏，用抽屉承载分集与资产
  const [infoOpen, setInfoOpen] = useState(false)
  const [pacingOpen, setPacingOpen] = useState(false)
  const [pacing, setPacing] = useState<PacingProfile | null>(
    (initialScript as unknown as { pacingProfile?: PacingProfile }).pacingProfile ?? null,
  )
  const [episodesSheetOpen, setEpisodesSheetOpen] = useState(false)
  const [assetsSheetOpen, setAssetsSheetOpen] = useState(false)

  const activeEpisode =
    script.episodes.find((e) => e.id === activeEpisodeId) ?? null

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

  async function generateForStoryboard(
    storyboard: StoryboardDTO,
    kind: "image" | "video",
  ) {
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

  // 稳定引用：StoryboardCard 已用 React.memo 包裹，避免父组件重渲染导致全网格失效
  const handleEditStoryboard = useCallback((storyboard: StoryboardDTO) => {
    setEditing(storyboard)
  }, [])
  const handleGenerateImage = useCallback((storyboard: StoryboardDTO) => {
    setGenerateTarget({ storyboard, kind: "image" })
  }, [])
  const handleGenerateVideo = useCallback((storyboard: StoryboardDTO) => {
    setGenerateTarget({ storyboard, kind: "video" })
  }, [])
  const handleSplit = useCallback(() => setSplitOpen(true), [])
  const handleRecap = useCallback(() => {
    setRecapResult(null)
    setRecapOpen(true)
  }, [])
  const handleSelectEpisode = useCallback((id: string) => {
    setActiveEpisodeId(id)
    setEpisodesSheetOpen(false)
  }, [])

  async function generateAssets(config: AssetSetup) {
    setGenerating(true)
    setProgress(5)
    setProgressLabel("正在提取全剧资产…")
    const poll = window.setInterval(() => void reloadScript(), 1500)
    try {
      const kinds = (["characters", "scenes", "props"] as const).filter(
        (kind) => !script[kind].length,
      )
      let assets = script
      if (kinds.length) {
        const res = await fetch(`/api/scripts/${script.id}/assets`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kinds, model: config.textModel }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "提取失败")
        assets = { ...script, ...payload.data }
      }
      const queue = (["characters", "scenes", "props"] as const).flatMap(
        (kind) =>
          assets[kind]
            .filter((item) => !item.imageUrl)
            .map((item) => ({
              kind:
                kind === "characters"
                  ? "character"
                  : kind === "scenes"
                    ? "scene"
                    : "prop",
              item,
            })),
      )
      for (const [index, entry] of queue.entries()) {
        setProgressLabel(
          `正在生成 ${entry.item.name}（${index + 1}/${queue.length}）`,
        )
        const res = await fetch(`/api/scripts/${script.id}/assets/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: entry.kind,
            ids: [entry.item.id],
            model: config.imageModel,
            aspectRatio: config.aspectRatio,
            resolution: config.resolution,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "资产生成失败")
        setProgress(Math.round(((index + 1) / queue.length) * 100))
      }
      await reloadScript()
      setAssetSetupOpen(false)
      toast.success("全剧资产已生成，可以继续拆分镜")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "资产生成失败")
    } finally {
      window.clearInterval(poll)
      setGenerating(false)
      setProgress(0)
    }
  }

  function runNextStep() {
    switch (script.status) {
      case "intake":
      case "outlining":
      case "assets":
        if (
          totalAssets > 0 &&
          [...script.characters, ...script.scenes, ...script.props].every(
            (item) => item.imageUrl,
          )
        )
          setSplitOpen(true)
        else setAssetSetupOpen(true)
        break
      case "storyboarding":
        setSplitMode("video")
        setSplitOpen(true)
        break
      case "video":
        setVideoBatchOpen(true)
        break
      default:
        setPostOpen(true)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <AssetSetupDialog
        open={assetSetupOpen}
        onOpenChange={setAssetSetupOpen}
        aspectRatio={script.targetAspect}
        onStart={(config) => void generateAssets(config)}
      />
      <ScriptDetailHeader
        script={script}
        onConsult={() => setConsultOpen(true)}
        onGenerateCover={() => void generateCover()}
        onRefresh={() => void reloadScript()}
        onInfo={() => setInfoOpen(true)}
      />

      <WorkflowTabs
        script={script}
        processing={script.processingStatus}
        counts={{
          episodes: script.episodes.length,
          assets: totalAssets,
          storyboards: storyboards.length,
        }}
      />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* 分集胶片条 */}
          <section className="border-b border-zinc-800/80 bg-zinc-950/40 px-3 pb-1 pt-2">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-[11px] font-medium tracking-wider text-zinc-400">
                分集
              </span>
              <span className="text-[11px] tabular-nums text-zinc-600">
                {script.episodes.length} 集
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="brand"
                  size="sm"
                  className="h-7"
                  disabled={generating}
                  onClick={runNextStep}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {script.status === "assets" &&
                  totalAssets > 0 &&
                  [
                    ...script.characters,
                    ...script.scenes,
                    ...script.props,
                  ].every((item) => item.imageUrl)
                    ? "下一步 · 拆分镜"
                    : (NEXT_STEP_LABEL[script.status] ?? "下一步")}
                </Button>
                <Button variant="outline" size="sm" className="h-7" asChild>
                  <Link href="/canvas">打通到画布</Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              <EpisodeStrip
                episodes={script.episodes}
                activeId={activeEpisodeId}
                onSelect={setActiveEpisodeId}
              />
            </div>
          </section>

          {/* 内容区：剧本内容 | 分镜 */}
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:grid-rows-1">
            <section className="min-h-0 border-b border-zinc-800/80 xl:border-b-0 xl:border-r">
              <ScriptContent
                episode={activeEpisode}
                onSaved={() => void reloadScript()}
              />
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
                onSplit={handleSplit}
                onRecap={handleRecap}
                onGenerateImage={handleGenerateImage}
                onGenerateVideo={handleGenerateVideo}
                onEdit={handleEditStoryboard}
              />
            </section>
          </div>
        </main>

        {/* 右：资产侧边栏 */}
        <aside className="hidden min-h-0 w-[300px] shrink-0 border-l border-zinc-800/80 bg-zinc-950/40 lg:block">
          <AssetSidebar
            scriptId={script.id}
            characters={script.characters}
            scenes={script.scenes}
            props={script.props}
            assetPromptTemplate={script.assetPromptTemplate}
            outfitPromptTemplate={script.outfitPromptTemplate}
            propPromptTemplate={script.propPromptTemplate}
            scenePromptTemplate={script.scenePromptTemplate}
            onRefresh={() => void reloadScript()}
          />
        </aside>
      </div>

      {/* 底部状态条 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-zinc-800/80 bg-zinc-950 px-4 py-2 text-[11px] text-zinc-500">
        <span>单集时长 {script.episodeDuration}s</span>
        <span className="text-zinc-700">·</span>
        <span>单集风格：{activeEpisode?.style ?? "跟随全剧"}</span>
        <span className="text-zinc-700">·</span>
        <span>目标画幅 {script.targetAspect}</span>
        <span>
          {script.processingStatus === "processing" ? (
            <span className="text-amber-400">
              {script.progressLabel ?? "处理中"}
            </span>
          ) : (
            <span className="text-emerald-400">
              {script.progressLabel ?? "就绪"}
            </span>
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
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setPostOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            后期合成
          </Button>

          {/* 移动端分集 / 资产入口（< lg 时两栏隐藏） */}
          <Sheet open={episodesSheetOpen} onOpenChange={setEpisodesSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 lg:hidden">
                <ListVideo className="h-3.5 w-3.5" />
                分集 {script.episodes.length}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">分集列表</SheetTitle>
              <EpisodeList
                episodes={script.episodes}
                activeId={activeEpisodeId}
                onSelect={handleSelectEpisode}
              />
            </SheetContent>
          </Sheet>

          <Sheet open={assetsSheetOpen} onOpenChange={setAssetsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 lg:hidden">
                <Package className="h-3.5 w-3.5" />
                资产 {totalAssets}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetTitle className="sr-only">全剧资产</SheetTitle>
              {/* pt-10 避开 Sheet 右上角的关闭按钮，防止与刷新按钮重叠 */}
              <div className="h-full pt-10">
                <AssetSidebar
                  scriptId={script.id}
                  characters={script.characters}
                  scenes={script.scenes}
                  props={script.props}
                  assetPromptTemplate={script.assetPromptTemplate}
                  outfitPromptTemplate={script.outfitPromptTemplate}
                  propPromptTemplate={script.propPromptTemplate}
                  scenePromptTemplate={script.scenePromptTemplate}
                  onRefresh={() => void reloadScript()}
                />
              </div>
            </SheetContent>
          </Sheet>
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
            initialMode={splitMode}
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
            episode={activeEpisode}
            result={recapResult}
            onLoaded={setRecapResult}
          />
        </>
      )}

      <ScriptInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        script={script}
        onOpenPacing={() => {
          setInfoOpen(false)
          setPacingOpen(true)
        }}
      />

      <PacingProfileDialog
        open={pacingOpen}
        onOpenChange={setPacingOpen}
        script={script}
        value={pacing}
        onSave={(profile) => {
          setPacing(profile)
          void reloadScript()
        }}
      />

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
