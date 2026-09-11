"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import Link from "next/link"
import {
  ListVideo,
  Loader2,
  Package,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react"
import { startTask, type ClientTask } from "@/lib/tasks/client"
import { episodeStage } from "@/lib/workflow/episode-state"
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
  const [currentTask, setCurrentTask] = useState<ClientTask | null>(null)
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(
    initialScript.episodes[0]?.id ?? null,
  )

  const activeEpisodeRef = useRef(activeEpisodeId)
  activeEpisodeRef.current = activeEpisodeId
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const batchRequests = useRef(new Set<string>())
  const [taskPollError, setTaskPollError] = useState<string | null>(null)
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null)
  const stoppingTaskRef = useRef<string | null>(null)
  const [storyboardsError, setStoryboardsError] = useState<string | null>(null)
  const loadSequence = useRef(0)
  const [storyboards, setStoryboards] = useState<StoryboardDTO[]>([])
  const [storyboardsLoading, setStoryboardsLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")

  const [assetSetupOpen, setAssetSetupOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitPhase, setSplitPhase] = useState<{
    active: boolean
    label: string
    mode: string
  } | null>(null)
  const [splitMode, setSplitMode] = useState<
    "text" | "image" | "video" | "bgm"
  >("image")
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
    (initialScript as unknown as { pacingProfile?: PacingProfile })
      .pacingProfile ?? null,
  )
  const [episodesSheetOpen, setEpisodesSheetOpen] = useState(false)
  const [assetsSheetOpen, setAssetsSheetOpen] = useState(false)

  const activeEpisode =
    script.episodes.find((e) => e.id === activeEpisodeId) ?? null
  const reviewContextKey = JSON.stringify({
    content: activeEpisode?.content,
    characters: script.characters.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      appearance: c.appearance,
      personality: c.personality,
      costumes: (c.costumes ?? []).map((k) => ({
        id: k.id,
        name: k.name,
        description: k.description,
        situation: k.situation,
      })),
    })),
    scenes: script.scenes.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      environment: s.environment,
      lighting: s.lighting,
    })),
    props: script.props.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      parentCharacterId: p.parentCharacterId,
    })),
  })
  const visibleTask =
    currentTask?.episodeId === activeEpisodeId ? currentTask : null
  const taskActive =
    !!visibleTask &&
    ["queued", "running", "cancel_requested"].includes(visibleTask.state)

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

  const loadStoryboards = useCallback(
    async (background = false) => {
      if (
        !activeEpisodeId ||
        activeEpisodeRef.current !== activeEpisodeId ||
        !mounted.current
      )
        return
      const sequence = ++loadSequence.current
      if (!background) setStoryboardsLoading(true)
      setStoryboardsError(null)
      try {
        const res = await fetch(
          `/api/scripts/${script.id}/episodes/${activeEpisodeId}/storyboards`,
        )
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "加载分镜失败")
        if (
          sequence === loadSequence.current &&
          activeEpisodeRef.current === activeEpisodeId &&
          mounted.current
        )
          setStoryboards(payload.data.storyboards ?? [])
      } catch (error) {
        if (
          sequence === loadSequence.current &&
          activeEpisodeRef.current === activeEpisodeId &&
          mounted.current
        )
          setStoryboardsError(
            error instanceof Error ? error.message : "加载分镜失败",
          )
      } finally {
        if (
          sequence === loadSequence.current &&
          activeEpisodeRef.current === activeEpisodeId &&
          mounted.current
        )
          setStoryboardsLoading(false)
      }
    },
    [script.id, activeEpisodeId],
  )

  useEffect(() => {
    setStoryboards([])
    setCurrentTask(null)
    setSplitPhase(null)
    setBatchVideoBusy(false)
    setBusyId(null)
    setEditing(null)
    setGenerateTarget(null)
    setSplitOpen(false)
    setTaskPollError(null)
    void loadStoryboards()
  }, [loadStoryboards])

  useEffect(() => {
    if (!activeEpisodeId) return
    let cancelled = false
    let reading = false
    let lastState = ""
    const poll = async () => {
      if (reading) return
      reading = true
      try {
        const res = await fetch(`/api/tasks?episodeId=${activeEpisodeId}`, {
          cache: "no-store",
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "任务状态读取失败")
        if (cancelled || activeEpisodeRef.current !== activeEpisodeId) return
        const tasks = payload.data as ClientTask[]
        const task =
          tasks.find((item) =>
            ["queued", "running", "cancel_requested"].includes(item.state),
          ) ??
          tasks[0] ??
          null
        setTaskPollError(null)
        setCurrentTask(task)
        const active =
          !!task &&
          ["queued", "running", "cancel_requested"].includes(task.state)
        setSplitPhase(
          active && task?.kind === "split"
            ? { active: true, label: task.currentLabel, mode: "text" }
            : null,
        )
        setBatchVideoBusy(
          (active && task?.kind === "video_batch") ||
            batchRequests.current.has(activeEpisodeId),
        )
        const state = task
          ? `${task.id}:${task.state}:${task.completed}:${task.failed}`
          : "none"
        if (state !== lastState) {
          lastState = state
          void loadStoryboards(true)
          void reloadScript()
        }
      } catch (error) {
        if (!cancelled && activeEpisodeRef.current === activeEpisodeId)
          setTaskPollError(
            error instanceof Error ? error.message : "任务状态读取失败",
          )
      } finally {
        reading = false
      }
    }
    void poll()
    const timer = setInterval(() => void poll(), 1500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [activeEpisodeId, loadStoryboards, reloadScript])

  async function requestStop(task: ClientTask) {
    if (stoppingTaskRef.current || task.state === "cancel_requested") return
    stoppingTaskRef.current = task.id
    setStoppingTaskId(task.id)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "PATCH" })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "请求停止失败")
      const updated = payload.data as ClientTask
      if (mounted.current && activeEpisodeRef.current === task.episodeId)
        setCurrentTask(updated)
      if (updated.state === "cancelled")
        toast.success("任务已停止，已完成产物已保留")
      else if (updated.state === "cancel_requested")
        toast.info("已请求停止，当前请求收尾中")
      else toast.info("任务已结束，请查看最终结果")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "请求停止失败")
    } finally {
      stoppingTaskRef.current = null
      if (mounted.current) setStoppingTaskId(null)
    }
  }

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
          model: "auto",
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
          modelId: script.assetGenerationConfig?.imageModelId ?? "auto",
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

  // 各类资产缺图数量（驱动「下一步·拆分镜」的禁用与灰字提示）
  const missingAssets = {
    characters: script.characters.filter((item) => !item.imageUrl).length,
    scenes: script.scenes.filter((item) => !item.imageUrl).length,
    props: script.props.filter((item) => !item.imageUrl).length,
  }
  const allAssetsImaged =
    totalAssets > 0 &&
    missingAssets.characters + missingAssets.scenes + missingAssets.props === 0

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
  const [batchVideoBusy, setBatchVideoBusy] = useState(false)
  async function enterVideo() {
    if (!activeEpisodeId) return
    const res = await fetch(
      `/api/scripts/${script.id}/episodes/${activeEpisodeId}/stage`,
      { method: "POST" },
    )
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error)
      return
    }
    await reloadScript()
  }
  async function handleBatchVideo() {
    const episodeId = activeEpisodeId
    if (!episodeId || batchRequests.current.has(episodeId)) return
    batchRequests.current.add(episodeId)
    setBatchVideoBusy(true)
    const stillHere = () =>
      mounted.current && activeEpisodeRef.current === episodeId
    try {
      await startTask(
        {
          kind: "video_batch",
          scriptId: script.id,
          episodeId,
          body: { model: "auto", aspectRatio: script.targetAspect },
        },
        (task) => {
          if (stillHere()) setCurrentTask(task)
        },
      )
      if (stillHere()) {
        await loadStoryboards(true)
        await reloadScript()
        toast.success("批量视频任务完成")
      }
    } catch (error) {
      if (stillHere()) {
        toast.error(error instanceof Error ? error.message : "视频任务失败")
        await loadStoryboards(true)
      }
    } finally {
      batchRequests.current.delete(episodeId)
      if (stillHere()) setBatchVideoBusy(false)
    }
  }
  const handleRecap = useCallback(() => {
    setRecapResult(null)
    setRecapOpen(true)
  }, [])
  const handleSelectEpisode = useCallback((id: string) => {
    setActiveEpisodeId(id)
    setEpisodesSheetOpen(false)
  }, [])

  /** 第一步：只提取资产描述词（不出图）。出图由右栏「重新出图」一次性完成。 */
  async function generateAssets(config: AssetSetup) {
    setGenerating(true)
    setProgress(0)
    setProgressLabel("正在提取全剧资产描述词…")
    // Poll: detect backend completion even if the fetch hangs (e.g. slow upstream AI).
    let pollStopped = false
    const poll = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/scripts/${script.id}`)
        const payload = await res.json()
        if (!res.ok || pollStopped) return
        const latest = payload.data as ScriptDetail
        setScript(latest)
        if (latest.processingStatus === "completed" && latest.status !== "intake" && latest.status !== "outlining") {
          pollStopped = true
          window.clearInterval(poll)
          setGenerating(false)
          setProgress(0)
          setAssetSetupOpen(false)
          toast.success("资产描述词已提取", {
            description: "第二步：点右栏右上角「重新出图」图标，一次性生成全部资产图",
          })
        }
      } catch { /* ignore poll errors */ }
    }, 2000)
    try {
      const kinds = (["characters", "scenes", "props"] as const).filter(
        (kind) => !script[kind].length,
      )
      if (kinds.length) {
        const res = await fetch(`/api/scripts/${script.id}/assets`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kinds,
            model: config.textModel,
            imageModel: config.imageModel,
            resolution: config.resolution,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "提取失败")
      }
      if (!pollStopped) {
        pollStopped = true
        setAssetSetupOpen(false)
        setProgress(100)
        await reloadScript()
        toast.success("资产描述词已提取", {
          description:
            "第二步：点右栏右上角「重新出图」图标，一次性生成全部资产图",
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提取失败")
    } finally {
      pollStopped = true
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
        initialConfig={script.assetGenerationConfig}
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

      {taskPollError && (
        <p
          role="alert"
          className="border-b border-zinc-800 px-3 py-2 text-xs text-orange-300"
        >
          {taskPollError}，正在重试读取；尚未确认任务最终状态。
        </p>
      )}
      {visibleTask && (
        <div
          data-testid="episode-task-status"
          className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-2 text-xs text-orange-300"
        >
          {taskActive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>
            {visibleTask.state === "cancel_requested"
              ? "已请求停止，当前请求收尾中"
              : visibleTask.currentLabel}
          </span>
          <span>
            成功 {visibleTask.completed} · 失败 {visibleTask.failed}
            {visibleTask.total !== null ? ` · 共 ${visibleTask.total} 项` : ""}
          </span>
          {visibleTask.error && <span role="alert">{visibleTask.error}</span>}
          {visibleTask.failed > 0 && (
            <span>已完成产物已保留，可在视频阶段重试未完成镜头。</span>
          )}
          {taskActive && (
            <Button
              size="sm"
              variant="outline"
              disabled={
                stoppingTaskId === visibleTask.id ||
                visibleTask.state === "cancel_requested"
              }
              onClick={() => void requestStop(visibleTask)}
            >
              {stoppingTaskId === visibleTask.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {visibleTask.state === "cancel_requested"
                ? "等待停止确认"
                : "请求停止"}
            </Button>
          )}
        </div>
      )}
      <WorkflowTabs
        script={script}
        processing={script.processingStatus}
        assetsReady={
          totalAssets > 0 &&
          [...script.characters, ...script.scenes, ...script.props].every(
            (item) => item.imageUrl,
          )
        }
        counts={{
          episodes: script.episodes.length,
          assets: totalAssets,
          storyboards: storyboards.length,
        }}
      />

      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* 分镜提示词时间轴（需求10：顶部 chip 条，可折叠） */}
          {storyboards.length > 0 && (
            <details className="border-b border-zinc-800/80 bg-zinc-950/40">
              <summary className="cursor-pointer select-none px-3 py-1.5 text-[11px] text-zinc-500">
                分镜提示词 · {storyboards.length} 个镜头（点击展开时间轴）
              </summary>
              <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
                {storyboards.map((item, index) => {
                  const start = storyboards
                    .slice(0, index)
                    .reduce((sum, s) => sum + (s.duration ?? 0), 0)
                  const end = start + (item.duration ?? 0)
                  const fmt = (sec: number) =>
                    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.round(sec % 60)).padStart(2, "0")}`
                  return (
                    <span
                      key={item.id}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-400"
                      title={item.description}
                    >
                      <span className="text-zinc-300">{item.shotType}</span>
                      <span className="tabular-nums text-zinc-600">
                        {fmt(start)}-{fmt(end)}
                      </span>
                    </span>
                  )
                })}
              </div>
            </details>
          )}

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
                {/* 需求9：资产未出齐时拆分镜按钮禁用，左侧灰字提示各类缺失数 */}
                {script.status === "assets" &&
                  totalAssets > 0 &&
                  !allAssetsImaged && (
                    <span className="text-[11px] text-zinc-600">
                      （
                      {missingAssets.characters > 0 &&
                        `角色 ${missingAssets.characters} 张 `}
                      {missingAssets.scenes > 0 &&
                        `场景 ${missingAssets.scenes} 张 `}
                      {missingAssets.props > 0 &&
                        `道具 ${missingAssets.props} 张 `}
                      关键资产未生成，点右栏「重新出图」补齐）
                    </span>
                  )}
                <Button
                  variant="brand"
                  size="sm"
                  className="h-7"
                  disabled={
                    generating ||
                    (script.status === "assets" &&
                      totalAssets > 0 &&
                      !allAssetsImaged)
                  }
                  onClick={runNextStep}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {script.status === "assets" && totalAssets > 0
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
              {storyboardsError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 text-xs text-orange-300"
                >
                  {storyboardsError}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void loadStoryboards()}
                  >
                    重试加载分镜
                  </Button>
                </div>
              )}
              <StoryboardSection
                key={activeEpisodeId}
                scriptId={script.id}
                reviewContextKey={reviewContextKey}
                episodeId={activeEpisodeId ?? ""}
                onEnterVideo={() => void enterVideo()}
                storyboards={storyboards}
                loading={storyboardsLoading}
                busyId={busyId}
                generating={generating}
                progress={progress}
                progressLabel={progressLabel}
                hasEpisode={Boolean(activeEpisode)}
                onSplit={handleSplit}
                splitPhase={splitPhase}
                aspectRatio={script.targetAspect}
                videoMode={
                  activeEpisode?.productionStage === "video" ||
                  storyboards.some((s) => s.videoUrl)
                }
                onBatchVideo={() => void handleBatchVideo()}
                batchVideoBusy={batchVideoBusy}
                assets={{
                  characters: script.characters.map((c) => ({
                    id: c.id,
                    name: c.name,
                    imageUrl: c.imageUrl,
                    costumes: (c.costumes ?? []).map((k) => ({
                      id: k.id,
                      name: k.name,
                    })),
                  })),
                  scenes: script.scenes.map((s) => ({
                    id: s.id,
                    name: s.name,
                    imageUrl: s.imageUrl,
                  })),
                  props: script.props.map((p) => ({
                    id: p.id,
                    name: p.name,
                    imageUrl: p.imageUrl,
                  })),
                }}
                onSegmentFill={async (items) => {
                  for (const item of items) {
                    const res = await fetch(
                      `/api/storyboards/${item.id}/generate`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          kind: "image",
                          model: "auto",
                          prompt: "按分镜描述生成分镜首帧图",
                          aspectRatio: script.targetAspect,
                        }),
                      },
                    )
                    if (!res.ok) {
                      const payload = await res.json().catch(() => ({}))
                      throw new Error(payload.error ?? "首帧图生成失败")
                    }
                  }
                  await loadStoryboards()
                }}
                onRefsSaved={() => void loadStoryboards()}
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
            assetGenerationConfig={script.assetGenerationConfig}
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
                  assetGenerationConfig={script.assetGenerationConfig}
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
            key={activeEpisode.id}
            open={splitOpen}
            onOpenChange={setSplitOpen}
            scriptId={script.id}
            episodeId={activeEpisode.id}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            initialMode={splitMode}
            onSplitPhase={(info) => {
              if (
                activeEpisodeRef.current !== activeEpisode.id ||
                !mounted.current
              )
                return
              setSplitPhase(info)
              // 拆分启动后收起配置弹窗，进度直接展示在分镜区（原型 image4/5）
              if (info?.active) setSplitOpen(false)
            }}
            onDone={() => {
              if (
                activeEpisodeRef.current !== activeEpisode.id ||
                !mounted.current
              )
                return
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
            key={activeEpisode.id}
            scriptId={script.id}
            episodeId={activeEpisode.id}
            aspectRatio={script.targetAspect}
            open={videoBatchOpen}
            onOpenChange={setVideoBatchOpen}
            episodeTitle={`EP${String(activeEpisode.number).padStart(2, "0")} ${activeEpisode.title}`}
            storyboards={storyboards}
            onDone={() => {
              if (
                activeEpisodeRef.current !== activeEpisode.id ||
                !mounted.current
              )
                return
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
