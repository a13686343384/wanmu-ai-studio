"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { toast } from "sonner"
import { TextNode } from "@/components/canvas/nodes/TextNode"
import { ImageNode } from "@/components/canvas/nodes/ImageNode"
import { AudioNode, VideoNode } from "@/components/canvas/nodes/MediaNodes"
import { AINode } from "@/components/canvas/nodes/AINode"
import { ScriptNode, StoryboardNode } from "@/components/canvas/nodes/ScriptNodes"
import { AnimatedEdge } from "@/components/canvas/edges/AnimatedEdge"
import { NodePanel } from "@/components/canvas/panels/NodePanel"
import { PropertiesPanel } from "@/components/canvas/panels/PropertiesPanel"
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar"
import { useCanvasStore, type CanvasNodeKind } from "@/stores/useCanvasStore"

/** 节点与边的类型注册表必须定义在组件外，避免每次渲染重建。 */
const nodeTypes: NodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  ai: AINode,
  script: ScriptNode,
  storyboard: StoryboardNode,
}

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
}

function CanvasEditorInner({ projectId }: { projectId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, setViewport } = useReactFlow()

  const {
    nodes,
    edges,
    viewport,
    loading,
    dirty,
    load,
    save,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    addNode,
    setViewport: storeSetViewport,
  } = useCanvasStore()

  useEffect(() => {
    void load(projectId).catch(() => toast.error("加载画布失败"))
  }, [projectId, load])

  // 恢复保存的视口
  useEffect(() => {
    if (!loading && viewport) setViewport(viewport)
  }, [loading, viewport, setViewport])

  // Ctrl/Cmd + S 保存
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        void save().then(() => toast.success("画布已保存"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [save])

  // 离开页面前提示未保存
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const kind = event.dataTransfer.getData("application/wanmusheng-node") as CanvasNodeKind
      if (!kind) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNode(kind, position)
    },
    [addNode, screenToFlowPosition],
  )

  const minimapColor = useMemo(
    () => (node: Node) => {
      const kind = (node.data as { kind?: string }).kind
      switch (kind) {
        case "ai":
          return "#f97316"
        case "image":
          return "#34d399"
        case "video":
          return "#fb7185"
        case "audio":
          return "#a78bfa"
        case "script":
          return "#38bdf8"
        case "storyboard":
          return "#22d3ee"
        default:
          return "#71717a"
      }
    },
    [],
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* 左：节点库 */}
      <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950/60 p-3 lg:block">
        <NodePanel />
      </aside>

      {/* 中：画布 */}
      <div ref={wrapperRef} className="relative flex-1" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            正在加载画布…
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            onMoveEnd={(_, nextViewport) => storeSetViewport(nextViewport)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-950"
            defaultEdgeOptions={{ type: "animated" }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#27272a" />
            <Controls
              className="!bottom-4 !left-4 !rounded-lg !border !border-zinc-800 !bg-zinc-900/90 [&>button]:!border-zinc-800 [&>button]:!bg-transparent [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-800"
              showInteractive={false}
            />
            <MiniMap
              pannable
              zoomable
              nodeColor={minimapColor}
              className="!bottom-4 !right-4 !rounded-lg !border !border-zinc-800 !bg-zinc-900/90"
              maskColor="rgba(9,9,11,0.72)"
            />

            {/* 顶部工具条 */}
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
              <CanvasToolbar />
            </div>

            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/70 px-8 py-6 text-center backdrop-blur">
                  <p className="text-sm text-zinc-300">画布是空的</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">
                    从左侧节点库点击或拖入节点
                    <br />
                    也可以从影视工厂「打通到画布」自动生成
                  </p>
                </div>
              </div>
            )}
          </ReactFlow>
        )}
      </div>

      {/* 右：属性面板 */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-950/60 p-3 xl:block">
        <PropertiesPanel />
      </aside>
    </div>
  )
}

/** 画布编辑器（含 ReactFlowProvider）。 */
export function CanvasEditor({ projectId }: { projectId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner projectId={projectId} />
    </ReactFlowProvider>
  )
}
