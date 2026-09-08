"use client"

import { create } from "zustand"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react"

/** 画布节点类型。 */
export type CanvasNodeKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "ai"
  | "script"
  | "storyboard"

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  kind: CanvasNodeKind
  /** 文本节点内容 */
  text?: string
  /** 媒体地址 */
  url?: string
  /** AI 节点配置 */
  model?: string
  prompt?: string
  negativePrompt?: string
  aspectRatio?: string
  resolution?: string
  duration?: string
  /** 剧本 / 分镜节点引用 */
  scriptId?: string
  episodeId?: string
  /** 状态 */
  status?: "idle" | "running" | "done" | "error"
  progress?: number
}

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

interface CanvasState {
  projectId: string | null
  projectName: string
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  selectedNodeId: string | null
  dirty: boolean
  loading: boolean
  saving: boolean
  past: Snapshot[]
  future: Snapshot[]

  load: (projectId: string) => Promise<void>
  save: () => Promise<void>

  onNodesChange: (changes: NodeChange<Node>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: (connection: Connection) => void

  addNode: (kind: CanvasNodeKind, position?: { x: number; y: number }) => string
  updateNodeData: (id: string, data: Partial<CanvasNodeData>) => void
  removeNode: (id: string) => void
  duplicateNode: (id: string) => void

  selectNode: (id: string | null) => void
  setViewport: (viewport: Viewport) => void

  undo: () => void
  redo: () => void
  clear: () => void
  autoLayout: () => void
}

const DEFAULT_DATA: Record<CanvasNodeKind, Omit<CanvasNodeData, "kind">> = {
  text: { label: "文本", text: "在这里输入文本内容…" },
  image: { label: "图片", url: "", aspectRatio: "16:9", status: "idle" },
  video: { label: "视频", url: "", aspectRatio: "16:9", status: "idle" },
  audio: { label: "音频", url: "", status: "idle" },
  ai: {
    label: "AI 生成",
    prompt: "",
    negativePrompt: "",
    model: "all-in-one",
    aspectRatio: "16:9",
    resolution: "1K",
    status: "idle",
    progress: 0,
  },
  script: { label: "剧本", scriptId: undefined, text: "" },
  storyboard: { label: "分镜", episodeId: undefined, text: "" },
}

function newId(kind: CanvasNodeKind) {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function snapshot(state: CanvasState): Snapshot {
  return { nodes: state.nodes, edges: state.edges }
}

const HISTORY_LIMIT = 50

export const useCanvasStore = create<CanvasState>((set, get) => {
  /** 在结构性修改前压入历史。 */
  function withHistory(updater: (state: CanvasState) => Partial<CanvasState>) {
    set((state) => {
      const past = [...state.past, snapshot(state)].slice(-HISTORY_LIMIT)
      return { ...updater(state), past, future: [], dirty: true }
    })
  }

  return {
    projectId: null,
    projectName: "",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeId: null,
    dirty: false,
    loading: false,
    saving: false,
    past: [],
    future: [],

    async load(projectId) {
      set({ loading: true })
      try {
        const res = await fetch(`/api/canvas/${projectId}`)
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "加载画布失败")

        set({
          projectId,
          projectName: payload.data.projectName ?? "",
          nodes: payload.data.nodes ?? [],
          edges: payload.data.edges ?? [],
          viewport: payload.data.viewport ?? { x: 0, y: 0, zoom: 1 },
          dirty: false,
          past: [],
          future: [],
          selectedNodeId: null,
        })
      } finally {
        set({ loading: false })
      }
    },

    async save() {
      const { projectId, nodes, edges, viewport } = get()
      if (!projectId) return

      set({ saving: true })
      try {
        const res = await fetch(`/api/canvas/${projectId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nodes, edges, viewport }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "保存失败")
        set({ dirty: false })
      } finally {
        set({ saving: false })
      }
    },

    onNodesChange(changes) {
      const structural = changes.some(
        (c) => c.type === "remove" || c.type === "add" || c.type === "replace",
      )
      if (structural) {
        withHistory((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
          selectedNodeId: null,
        }))
      } else {
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes), dirty: true }))
      }
    },

    onEdgesChange(changes) {
      const structural = changes.some((c) => c.type === "remove" || c.type === "add")
      if (structural) {
        withHistory((state) => ({ edges: applyEdgeChanges(changes, state.edges) }))
      } else {
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges), dirty: true }))
      }
    },

    onConnect(connection) {
      withHistory((state) => ({
        edges: addEdge(
          { ...connection, type: "animated", animated: true },
          state.edges,
        ),
      }))
    },

    addNode(kind, position) {
      const id = newId(kind)
      const data = { kind, ...DEFAULT_DATA[kind] } as CanvasNodeData
      const pos = position ?? {
        x: 120 + Math.random() * 320,
        y: 100 + Math.random() * 240,
      }

      withHistory((state) => ({
        nodes: [
          ...state.nodes,
          { id, type: kind, position: pos, data } as Node,
        ],
        selectedNodeId: id,
      }))

      return id
    },

    updateNodeData(id, data) {
      withHistory((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...(node.data as CanvasNodeData), ...data } }
            : node,
        ),
      }))
    },

    removeNode(id) {
      withHistory((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }))
    },

    duplicateNode(id) {
      const node = get().nodes.find((n) => n.id === id)
      if (!node) return

      const copyId = newId(node.type as CanvasNodeKind)
      withHistory((state) => ({
        nodes: [
          ...state.nodes,
          {
            ...node,
            id: copyId,
            position: { x: node.position.x + 40, y: node.position.y + 40 },
            selected: false,
          } as Node,
        ],
        selectedNodeId: copyId,
      }))
    },

    selectNode(id) {
      set({ selectedNodeId: id })
    },

    setViewport(viewport) {
      set({ viewport })
    },

    undo() {
      const { past, future, nodes, edges } = get()
      const previous = past[past.length - 1]
      if (!previous) return

      set({
        nodes: previous.nodes,
        edges: previous.edges,
        past: past.slice(0, -1),
        future: [...future, { nodes, edges }].slice(-HISTORY_LIMIT),
        dirty: true,
      })
    },

    redo() {
      const { past, future, nodes, edges } = get()
      const next = future[future.length - 1]
      if (!next) return

      set({
        nodes: next.nodes,
        edges: next.edges,
        future: future.slice(0, -1),
        past: [...past, { nodes, edges }].slice(-HISTORY_LIMIT),
        dirty: true,
      })
    },

    clear() {
      withHistory(() => ({ nodes: [], edges: [], selectedNodeId: null }))
    },

    /** 简单网格自动布局，便于一键整理。 */
    autoLayout() {
      withHistory((state) => {
        const columns = Math.max(1, Math.ceil(Math.sqrt(state.nodes.length)))
        const nodes = state.nodes.map((node, index) => ({
          ...node,
          position: {
            x: 80 + (index % columns) * 340,
            y: 80 + Math.floor(index / columns) * 300,
          },
        }))
        return { nodes }
      })
    },
  }
})
