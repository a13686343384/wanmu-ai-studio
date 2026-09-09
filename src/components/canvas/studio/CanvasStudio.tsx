"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useReactFlow,
  addEdge,
  useViewport,
  getViewportForBounds,
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  AudioLines,
  Boxes,
  Coins,
  Copy,
  Download,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  Magnet,
  Map,
  PanelLeftOpen,
  ScanLine,
  Ruler,
  Camera,
  Plus,
  Redo2,
  Save,
  Share2,
  TextQuote,
  Undo2,
  Video,
  Workflow,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StudioSidebar } from "./StudioSidebar"
import { AgentDock } from "./AgentDock"
import {
  DirectorDeskDialog,
  type DirectorDeskCapture,
} from "./DirectorDeskDialog"
import { StudioContextMenu } from "./StudioContextMenu"
import {
  StudioActionNode,
  StudioAudioNode,
  StudioDirectorNode,
  StudioImageNode,
  StudioStickyNode,
  StudioTextNode,
  StudioVideoNode,
} from "./nodes"
import {
  StudioContext,
  STUDIO_KIND_META,
  type StudioNodeData,
  type StudioNodeKind,
} from "./types"
import { uploadStudioMedia } from "./upload"
import { cn } from "@/lib/utils"

const nodeTypes = {
  text: StudioTextNode,
  image: StudioImageNode,
  video: StudioVideoNode,
  audio: StudioAudioNode,
  director: StudioDirectorNode,
  action: StudioActionNode,
  sticky: StudioStickyNode,
}

interface StudioNode extends Node<StudioNodeData> {}

interface GraphSnapshot {
  nodes: StudioNode[]
  edges: Edge[]
}

function makeNode(
  kind: StudioNodeKind,
  position: { x: number; y: number },
  index: number,
): StudioNode {
  const meta = STUDIO_KIND_META[kind]
  return {
    id: `n_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    type: kind,
    position,
    data: {
      label: meta.label,
      kind,
      ...(kind === "text" ? { text: "" } : {}),
      ...(kind === "action"
        ? {
            meta: {
              sceneType: "对打",
              clipDuration: 15,
              outputAspect: "9:16",
              status: "idle",
            },
          }
        : {}),
    },
  }
}

function CanvasStudioInner({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const { zoom } = useViewport()
  const { update: updateSession } = useSession()
  const router = useRouter()
  const reactFlow = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [showMap, setShowMap] = useState(true)
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  )
  const [sidebarTab, setSidebarTab] = useState<"canvas" | "assets">("canvas")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [agentOpen, setAgentOpen] = useState(false)
  const [directorOpen, setDirectorOpen] = useState(false)
  const [directorNodeId, setDirectorNodeId] = useState("")
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [smartAlign, setSmartAlign] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    flowX: number
    flowY: number
  } | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const historyPast = useRef<GraphSnapshot[]>([])
  const historyFuture = useRef<GraphSnapshot[]>([])
  const saveTimer = useRef<number | null>(null)
  const stateRef = useRef({ nodes, edges })
  stateRef.current = { nodes, edges }
  const flowWrapperRef = useRef<HTMLDivElement>(null)
  const savedGraph = useRef("")
  const saving = useRef<Promise<boolean> | null>(null)
  const pendingUpload = useRef<{ x: number; y: number } | null>(null)

  /* ---------------------------- 加载 / 保存 ---------------------------- */

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/canvas/${projectId}`)
        const payload = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(payload.error ?? "加载画布失败")
        {
          savedGraph.current = JSON.stringify({
            nodes: payload.data.nodes ?? [],
            edges: payload.data.edges ?? [],
            viewport: payload.data.viewport,
          })
          setNodes(
            (payload.data.nodes ?? []).map((node: StudioNode) => ({
              ...node,
              data: { ...node.data, generating: false },
            })),
          )
          setEdges(payload.data.edges ?? [])
          if (payload.data.viewport) {
            window.setTimeout(
              () => reactFlow.setViewport(payload.data.viewport),
              0,
            )
          }
        }
        if (!cancelled) setLoaded(true)
      } catch (error) {
        if (!cancelled)
          setLoadError(error instanceof Error ? error.message : "加载画布失败")
      } finally {
        if (!cancelled) {
          setSaveState("saved")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, reactFlow, setNodes, setEdges])

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session")
      const payload = await res.json()
      if (typeof payload?.user?.tapies === "number")
        setCredits(payload.user.tapies)
    } catch {
      /* 忽略：顶栏积分仅展示 */
    }
  }, [])

  useEffect(() => {
    void fetchCredits()
    const onGenerated = () => {
      void updateSession().then((session) => {
        if (session?.user) setCredits(session.user.tapies)
      })
      toast.success("生成完成", { description: "结果已写入节点" })
    }
    const onError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail
      toast.error(message || "生成失败")
    }
    window.addEventListener("studio:generated", onGenerated)
    window.addEventListener("studio:error", onError)
    return () => {
      window.removeEventListener("studio:generated", onGenerated)
      window.removeEventListener("studio:error", onError)
    }
  }, [fetchCredits, updateSession])

  const save = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!loaded || loadError) return false
      while (saving.current) {
        const ok = await saving.current
        if (!ok) return false
      }
      const body = JSON.stringify({
        ...stateRef.current,
        viewport: reactFlow.getViewport(),
      })
      if (body === savedGraph.current) return true
      setSaveState("saving")
      const task = (async () => {
        try {
          const res = await fetch(`/api/canvas/${projectId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body,
          })
          const payload = await res.json()
          if (!res.ok) throw new Error(payload.error ?? "保存失败")
          savedGraph.current = body
          const current = JSON.stringify({
            ...stateRef.current,
            viewport: reactFlow.getViewport(),
          })
          setSaveState(current === body ? "saved" : "unsaved")
          return true
        } catch (error) {
          setSaveState("unsaved")
          toast.error(
            error instanceof Error ? error.message : "自动保存失败，请重试",
            { id: "canvas-save" },
          )
          return false
        }
      })()
      saving.current = task
      const ok = await task
      if (saving.current === task) saving.current = null
      if (ok && !silent) toast.success("画布已保存")
      return ok
    },
    [loaded, loadError, projectId, reactFlow],
  )

  const scheduleSave = useCallback(() => {
    if (!loaded || loadError) return
    setSaveState("unsaved")
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void save(true), 1500)
  }, [loaded, loadError, save])

  useEffect(() => {
    scheduleSave()
  }, [nodes, edges, scheduleSave])
  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    },
    [],
  )
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void save()
      }
    }
    const onLeave = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved" && loaded) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("beforeunload", onLeave)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("beforeunload", onLeave)
    }
  }, [save, saveState, loaded])

  /* ---------------------------- 撤销 / 重做 ---------------------------- */

  const snapshot = useCallback(
    () => ({
      nodes: structuredClone(stateRef.current.nodes),
      edges: structuredClone(stateRef.current.edges),
    }),
    [],
  )

  const pushHistory = useCallback(() => {
    historyPast.current = [...historyPast.current.slice(-24), snapshot()]
    historyFuture.current = []
  }, [snapshot])

  const duplicateSelected = useCallback(() => {
    const selected = stateRef.current.nodes.filter((node) => node.selected)
    if (!selected.length) return
    pushHistory()
    const copies = selected.map((node) => ({
      ...structuredClone(node),
      id: crypto.randomUUID(),
      position: { x: node.position.x + 32, y: node.position.y + 32 },
      data: { ...node.data, generating: false },
    }))
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      ...copies,
    ])
  }, [pushHistory, setNodes])

  const undo = useCallback(() => {
    const previous = historyPast.current.pop()
    if (!previous) {
      toast.info("没有可撤销的操作")
      return
    }
    historyFuture.current = [...historyFuture.current, snapshot()]
    setNodes(previous.nodes)
    setEdges(previous.edges)
  }, [setNodes, setEdges, snapshot])

  const redo = useCallback(() => {
    const next = historyFuture.current.pop()
    if (!next) {
      toast.info("没有可重做的操作")
      return
    }
    historyPast.current = [...historyPast.current, snapshot()]
    setNodes(next.nodes)
    setEdges(next.edges)
  }, [setNodes, setEdges, snapshot])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        (event.target as HTMLElement).closest(
          "input,textarea,[contenteditable=true]",
        )
      )
        return
      if (event.key.toLowerCase() === "z") {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault()
        duplicateSelected()
      }
      if (event.key === "0") {
        event.preventDefault()
        void reactFlow.fitView({ padding: 0.2 })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, reactFlow, duplicateSelected])

  /* ---------------------------- 节点操作 ---------------------------- */

  const spawnNode = useCallback(
    (kind: StudioNodeKind, flowPosition: { x: number; y: number }) => {
      pushHistory()
      const offset = (stateRef.current.nodes.length % 5) * 36
      const node = makeNode(
        kind,
        { x: flowPosition.x + offset, y: flowPosition.y + offset },
        Date.now() % 1000,
      )
      setNodes((current) => [...current, node])
    },
    [pushHistory, setNodes],
  )

  const addNode = useCallback(
    (kind: StudioNodeKind) => {
      if (!loaded) return
      const center = reactFlow.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      spawnNode(kind, { x: center.x - 180, y: center.y - 140 })
    },
    [loaded, reactFlow, spawnNode],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory()
      setEdges((current) => addEdge(connection, current))
    },
    [pushHistory, setEdges],
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault()
      const { clientX, clientY } = event as MouseEvent
      const flow = reactFlow.screenToFlowPosition({ x: clientX, y: clientY })
      setContextMenu({ x: clientX, y: clientY, flowX: flow.x, flowY: flow.y })
    },
    [reactFlow],
  )

  async function handleContextUpload(file: File) {
    const position = pendingUpload.current
    if (!position) return
    try {
      const url = await uploadStudioMedia(projectId, file)
      const kind = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : "image"
      const node = makeNode(kind, position, Date.now())
      node.data = { ...node.data, url, fileName: file.name }
      pushHistory()
      setNodes((current) => [...current, node])
      toast.success("素材已上传")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败")
    }
  }

  const openDirectorDesk = useCallback((nodeId: string) => {
    setDirectorNodeId(nodeId)
    setDirectorOpen(true)
  }, [])

  const onDirectorCaptures = useCallback(
    (captures: DirectorDeskCapture[]) => {
      pushHistory()
      const directorNode = stateRef.current.nodes.find(
        (node) => node.id === directorNodeId,
      )
      const base = directorNode?.position ?? { x: 0, y: 0 }
      const newNodes: StudioNode[] = captures.map((capture, index) => ({
        id: `n_${Date.now().toString(36)}_cap_${index}`,
        type: "image",
        position: { x: base.x + 460, y: base.y + index * 320 },
        data: {
          label: "当前视角截图",
          kind: "image",
          url: capture.dataUrl,
          fileName: capture.fileName,
        },
      }))
      const newEdges: Edge[] = newNodes.map((node) => ({
        id: `e_${directorNodeId}_${node.id}`,
        source: directorNodeId,
        target: node.id,
      }))
      setNodes((current) => [...current, ...newNodes])
      setEdges((current) => [...current, ...newEdges])
      toast.success(`已添加 ${captures.length} 张截图到画布`)
    },
    [directorNodeId, pushHistory, setEdges, setNodes],
  )

  const studioContext = useMemo(
    () => ({
      projectId,
      beforeChange: pushHistory,
      openDirectorDesk,
      setSidebarTab: (tab: "canvas" | "assets") => {
        setSidebarOpen(true)
        setSidebarTab(tab)
      },
      notify: (message: string, description?: string) =>
        toast.info(message, { description }),
    }),
    [openDirectorDesk, projectId, pushHistory],
  )

  const locateNode = useCallback(
    (nodeId: string) => {
      const node = stateRef.current.nodes.find((item) => item.id === nodeId)
      if (!node) return
      setNodes((current) =>
        current.map((item) => ({ ...item, selected: item.id === nodeId })),
      )
      void reactFlow.fitView({
        nodes: [{ id: nodeId }],
        padding: 0.4,
        maxZoom: 1,
        duration: 400,
      })
    },
    [reactFlow, setNodes],
  )

  const imageCount = nodes.filter(
    (node) => node.type === "image" && (node.data as StudioNodeData).url,
  ).length

  const downloadAll = useCallback(() => {
    const media = nodes.filter(
      (node) => node.type === "image" && (node.data as StudioNodeData).url,
    )
    if (media.length === 0) {
      toast.info("画布上还没有图片")
      return
    }
    for (const node of media) {
      const data = node.data as StudioNodeData
      const anchor = document.createElement("a")
      anchor.href = data.url!
      anchor.download = data.fileName ?? `${data.label}.png`
      anchor.click()
    }
  }, [nodes])

  async function flushSave() {
    if (!loaded) return false
    do {
      if (!(await save(true))) return false
    } while (
      JSON.stringify({
        ...stateRef.current,
        viewport: reactFlow.getViewport(),
      }) !== savedGraph.current
    )
    return true
  }

  async function leaveForProjects() {
    if (!loaded || (await flushSave())) router.push("/canvas")
  }

  async function share() {
    if (!(await flushSave())) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("分享链接已复制")
    } catch {
      toast.info("分享链接", { description: window.location.href })
    }
  }

  async function createProject() {
    if (!(await flushSave())) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `新项目 ${new Date().toLocaleDateString("zh-CN")}`,
      }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "创建失败")
      return
    }
    router.push(`/canvas/${payload.data.id}`)
  }

  async function deleteProject() {
    if (!window.confirm(`确定删除「${projectName}」吗？项目会移入回收站。`))
      return
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
    if (!res.ok) {
      const payload = await res.json()
      toast.error(payload.error ?? "删除失败")
      return
    }
    toast.success("已删除")
    router.push("/canvas")
  }

  async function exportCanvas() {
    const viewport = flowWrapperRef.current?.querySelector<HTMLElement>(
      ".react-flow__viewport",
    )
    if (!viewport || !nodes.length) return
    setExporting(true)
    try {
      const { toPng } = await import("html-to-image")
      const bounds = reactFlow.getNodesBounds(nodes)
      const width = Math.ceil(bounds.width + 100),
        height = Math.ceil(bounds.height + 100)
      const transform = getViewportForBounds(bounds, width, height, 1, 1, 0)
      const url = await toPng(viewport, {
        backgroundColor: "#09090b",
        width,
        height,
        pixelRatio: 1,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(1)`,
        },
      })
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${projectName}.png`
      anchor.click()
      toast.success("工程截图已导出")
    } catch {
      toast.error("截图导出失败，请检查素材是否可访问")
    } finally {
      setExporting(false)
    }
  }

  const TOOLBAR_ITEMS: {
    kind: StudioNodeKind
    label: string
    icon: typeof TextQuote
  }[] = [
    { kind: "text", label: "文本", icon: TextQuote },
    { kind: "image", label: "图片", icon: ImageIcon },
    { kind: "video", label: "视频", icon: Video },
    { kind: "audio", label: "音频", icon: AudioLines },
    { kind: "director", label: "导演台", icon: Layers },
    { kind: "action", label: "动作导演", icon: Boxes },
    { kind: "sticky", label: "便签", icon: Copy },
  ]

  return (
    <StudioContext.Provider value={studioContext}>
      <div className="studio-root flex h-[100dvh] w-full flex-col overflow-hidden bg-zinc-950">
        {/* 顶栏 */}
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/90 text-xs font-bold text-white"
                aria-label="项目操作"
              >
                M
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => void leaveForProjects()}>
                全部项目
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void createProject()}>
                创建新项目
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onClick={() => void deleteProject()}
              >
                删除项目
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!sidebarOpen && (
            <button
              type="button"
              aria-label="展开侧栏"
              className="p-1 text-zinc-400"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          <h1 className="max-w-[240px] truncate text-sm text-zinc-200">
            {projectName}
          </h1>

          <div className="ml-1 flex items-center gap-0.5">
            <button
              type="button"
              aria-label="撤销"
              onClick={undo}
              className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="重做"
              onClick={redo}
              className="rounded-md border border-zinc-800 p-1.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span
              className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] tabular-nums text-amber-300"
              title="积分余额"
            >
              <Coins className="h-3 w-3" />
              {credits ?? "—"}
            </span>
            <span
              className="hidden items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-500 md:flex"
              title="存储用量"
            >
              <HardDrive className="h-3 w-3" />
              0.0MB / 100MB
            </span>

            <button
              type="button"
              onClick={downloadAll}
              className="hidden items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200 lg:flex"
            >
              <Download className="h-3 w-3" />
              下载全部({imageCount})
            </button>

            <Button
              variant="brand"
              size="sm"
              className="h-7"
              onClick={() => void share()}
            >
              <Share2 className="h-3.5 w-3.5" />
              分享
            </Button>

            <button
              type="button"
              onClick={() =>
                toast.info("工作流", { description: "可视化编排 · 即将上线" })
              }
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-zinc-600"
            >
              <Workflow className="h-3 w-3" />
              工作流
              <span className="rounded bg-emerald-500/15 px-1 text-[9px] text-emerald-400">
                NEW
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAgentOpen((value) => !value)}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors",
                agentOpen
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600",
              )}
            >
              Agent
              <span className="rounded bg-emerald-500/15 px-1 text-[9px] text-emerald-400">
                NEW
              </span>
            </button>

            <button
              type="button"
              aria-label="保存"
              data-testid="studio-save"
              onClick={() => void save()}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors",
                saveState === "saved"
                  ? "border-zinc-800 text-zinc-500"
                  : "border-orange-500/50 text-orange-300",
              )}
            >
              {saveState === "saving" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {saveState === "saved"
                ? "已保存"
                : saveState === "saving"
                  ? "保存中…"
                  : "保存"}
            </button>
          </div>
        </header>

        {/* 主体 */}
        <div className="flex min-h-0 flex-1">
          {sidebarOpen && (
            <StudioSidebar
              nodes={nodes}
              tab={sidebarTab}
              onTabChange={setSidebarTab}
              onLocate={locateNode}
              onCollapse={() => setSidebarOpen(false)}
            />
          )}

          <div className="studio-workspace relative flex min-w-0 flex-1 flex-col">
            <div ref={flowWrapperRef} className="relative min-h-0 flex-1">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={pushHistory}
                onNodeDragStop={(event, node) => {
                  if (!smartAlign || event.shiftKey || snapToGrid) return
                  const threshold = 8 / reactFlow.getZoom()
                  let x = node.position.x,
                    y = node.position.y
                  for (const other of stateRef.current.nodes) {
                    if (other.id === node.id || other.selected) continue
                    if (Math.abs(other.position.x - x) < threshold)
                      x = other.position.x
                    if (Math.abs(other.position.y - y) < threshold)
                      y = other.position.y
                  }
                  setNodes((current) =>
                    current.map((item) =>
                      item.id === node.id
                        ? { ...item, position: { x, y } }
                        : item,
                    ),
                  )
                }}
                onBeforeDelete={async () => {
                  pushHistory()
                  return true
                }}
                isValidConnection={(connection) =>
                  connection.source !== connection.target &&
                  !edges.some(
                    (edge) =>
                      edge.source === connection.source &&
                      edge.target === connection.target,
                  )
                }
                onMoveEnd={scheduleSave}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={closeContextMenu}
                onMoveStart={closeContextMenu}
                nodeTypes={nodeTypes}
                colorMode="dark"
                nodesDraggable={loaded}
                nodesConnectable={loaded}
                deleteKeyCode={["Backspace", "Delete"]}
                snapToGrid={snapToGrid}
                snapGrid={[16, 16]}
                connectionRadius={42}
                proOptions={{ hideAttribution: true }}
                minZoom={0.2}
                maxZoom={2.5}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={22}
                  size={1.5}
                  color="#2a2a2e"
                />
                {nodes.length === 0 && loaded && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-zinc-600">
                      画布是空的 · 从下方工具栏添加节点开始创作
                    </p>
                  </div>
                )}

                {showMap && (
                  <MiniMap
                    pannable
                    zoomable
                    position="bottom-left"
                    style={{ width: 176, height: 100 }}
                    bgColor="#18181b"
                    maskColor="rgba(9,9,11,0.35)"
                    maskStrokeColor="#71717a"
                    maskStrokeWidth={1}
                    nodeColor="#52525b"
                    nodeStrokeWidth={0}
                  />
                )}
              </ReactFlow>
              {(!loaded || loadError) && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 text-sm text-zinc-400">
                  {loadError ? (
                    <>
                      <p>{loadError}</p>
                      <Button onClick={() => window.location.reload()}>
                        重新加载画布
                      </Button>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      正在加载画布…
                    </>
                  )}
                </div>
              )}
            </div>
            <footer className="studio-footer z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950 p-2">
              {/* 缩放控制 */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 px-1 py-0.5 text-zinc-400 backdrop-blur">
                <button
                  type="button"
                  aria-label={showMap ? "隐藏小地图" : "显示小地图"}
                  onClick={() => setShowMap((value) => !value)}
                  className="p-1.5"
                >
                  <Map className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="缩小"
                  onClick={() => reactFlow.zoomOut()}
                  className="rounded px-1.5 py-0.5 hover:text-zinc-100"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="适应画布"
                  onClick={() => reactFlow.fitView({ duration: 300 })}
                  className="rounded px-1.5 py-0.5 text-[11px] tabular-nums hover:text-zinc-100"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  aria-label="放大"
                  onClick={() => reactFlow.zoomIn()}
                  className="rounded px-1.5 py-0.5 hover:text-zinc-100"
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label="智能对齐"
                  aria-pressed={smartAlign}
                  title="智能对齐（按住 Shift 临时关闭）"
                  onClick={() => setSmartAlign((value) => !value)}
                  className={cn("p-1.5", smartAlign && "text-orange-400")}
                >
                  <Ruler className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="工程截图"
                  title="导出画布 PNG"
                  disabled={exporting || !nodes.length}
                  onClick={() => void exportCanvas()}
                  className="p-1.5 disabled:opacity-40"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <span className="px-1 text-[10px] text-zinc-600">
                  {nodes.length} 节点
                </span>
                <button
                  type="button"
                  aria-label="网格吸附"
                  onClick={() => setSnapToGrid((value) => !value)}
                  className={cn(
                    "rounded p-1 transition-colors",
                    snapToGrid ? "text-orange-400" : "hover:text-zinc-100",
                  )}
                >
                  <Magnet className="h-3 w-3" />
                </button>
              </div>

              {/* 底部工具条 */}
              <div
                data-testid="studio-toolbar"
                className="flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-2xl backdrop-blur"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="添加节点"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-100 transition-colors hover:bg-orange-500"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-40"
                  >
                    {TOOLBAR_ITEMS.map((item) => (
                      <DropdownMenuItem
                        key={item.kind}
                        onSelect={() => addNode(item.kind)}
                      >
                        <item.icon />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {TOOLBAR_ITEMS.slice(0, 6).map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      aria-label={`新建${item.label}`}
                      title={item.label}
                      onClick={() => addNode(item.kind)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}

                <button
                  type="button"
                  aria-label="复制选中节点"
                  title="复制选中节点（⌘D）"
                  onClick={duplicateSelected}
                  disabled={!nodes.some((node) => node.selected)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="网格吸附设置"
                  onClick={() => setSnapToGrid((value) => !value)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100",
                    snapToGrid && "text-orange-400",
                  )}
                >
                  <Magnet className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </div>

          {agentOpen && <AgentDock onClose={() => setAgentOpen(false)} />}
        </div>

        {contextMenu && (
          <StudioContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onSelect={(kind) =>
              spawnNode(kind, { x: contextMenu.flowX, y: contextMenu.flowY })
            }
            onUpload={() => {
              pendingUpload.current = {
                x: contextMenu.flowX,
                y: contextMenu.flowY,
              }
              uploadInputRef.current?.click()
            }}
            onClose={closeContextMenu}
          />
        )}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleContextUpload(file)
            event.target.value = ""
          }}
        />

        <DirectorDeskDialog
          open={directorOpen}
          instanceId={`${projectId}-${directorNodeId}`}
          onClose={() => setDirectorOpen(false)}
          onCaptures={onDirectorCaptures}
        />
      </div>
    </StudioContext.Provider>
  )
}

/** 画布操作页入口（包 Provider 以使用 useReactFlow）。 */
export function CanvasStudio({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  return (
    <ReactFlowProvider>
      <CanvasStudioInner projectId={projectId} projectName={projectName} />
    </ReactFlowProvider>
  )
}
