"use client"

import { createContext, useContext } from "react"

export type StudioNodeKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "director"
  | "action"
  | "sticky"

/** 画布操作页节点数据（持久化进 Canvas.nodes JSON）。 */
export interface StudioNodeData {
  label: string
  kind: StudioNodeKind
  /** 文本 / 便签正文（文本节点含生成结果） */
  text?: string
  /** 图片 / 视频 / 音频资源地址（生成结果或本地上传） */
  url?: string
  fileName?: string
  /** Composer 草稿 */
  prompt?: string
  /** Composer 选中的模型 */
  modelId?: string
  /** 动作导演等节点的扩展配置 */
  meta?: {
    sceneType?: string
    requirement?: string
    historyOptimize?: boolean
    clipDuration?: number
    outputAspect?: string
    plan?: string
    status?: "idle" | "running" | "done"
  }
  [key: string]: unknown
}

/** 跨组件能力：打开导演台、切换侧栏 Tab、提示。 */
export interface StudioContextValue {
  projectId: string
  beforeChange: () => void
  openDirectorDesk: (nodeId: string) => void
  setSidebarTab: (tab: "canvas" | "assets") => void
  notify: (message: string, description?: string) => void
}

export const StudioContext = createContext<StudioContextValue>({
  projectId: "",
  beforeChange: () => {},
  openDirectorDesk: () => {},
  setSidebarTab: () => {},
  notify: () => {},
})

export const useStudio = () => useContext(StudioContext)

export const STUDIO_KIND_META: Record<
  StudioNodeKind,
  { label: string; defaultWidth: number }
> = {
  text: { label: "新建文本", defaultWidth: 380 },
  image: { label: "Image", defaultWidth: 420 },
  video: { label: "Video", defaultWidth: 420 },
  audio: { label: "音频", defaultWidth: 460 },
  director: { label: "导演台", defaultWidth: 340 },
  action: { label: "动作导演", defaultWidth: 360 },
  sticky: { label: "便签", defaultWidth: 240 },
}
