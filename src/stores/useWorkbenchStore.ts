"use client"

import { create } from "zustand"
import type { AIModel } from "@/lib/constants"

export type MediaType = "video" | "image" | "audio"

export interface ReferenceAsset {
  id: string
  name: string
  /** 预览地址（本地 ObjectURL 或远程 URL） */
  url: string
  kind: "image" | "video" | "audio"
  size?: number
}

export interface GenerationResult {
  id: string
  url: string
  poster?: string
  mediaType: MediaType
  prompt: string
  model: string
  createdAt: string
}

interface WorkbenchState {
  /** 当前媒体类型 */
  mediaType: MediaType
  /** 视频生成能力（全能参考生视频 / 首尾帧生视频），仅 mediaType=video 时生效 */
  videoFeature: string
  /** 当前选中的模型 id */
  modelId: string
  aspectRatio: string
  resolution: string
  duration: string
  count: number
  style: string | null
  /** 音频模式：智能歌词 / 纯音乐 */
  smartLyrics: boolean
  prompt: string
  references: ReferenceAsset[]
  isGenerating: boolean
  progress: number
  progressLabel: string
  results: GenerationResult[]

  setMediaType: (type: MediaType) => void
  setVideoFeature: (feature: string) => void
  setModel: (id: string) => void
  setAspectRatio: (value: string) => void
  setResolution: (value: string) => void
  setDuration: (value: string) => void
  setCount: (value: number) => void
  setStyle: (value: string | null) => void
  setSmartLyrics: (value: boolean) => void
  setPrompt: (value: string) => void
  addReferences: (assets: ReferenceAsset[]) => void
  removeReference: (id: string) => void
  setGenerating: (value: boolean, progress?: number, label?: string) => void
  setProgress: (progress: number, label?: string) => void
  addResult: (result: GenerationResult) => void
  reset: () => void
}

/**
 * 按媒体类型返回可用的模型清单。
 * @deprecated 请使用 useAiModels hook 获取动态模型列表（live/mock 模式感知）。
 * 此函数仅保留作为 fallback，返回空数组。
 */
export function modelsForMediaType(_type: MediaType): readonly AIModel[] {
  return []
}

/** 媒体类型切换时，默认选中该类型下的第一个模型。 */
function defaultModelId(_type: MediaType) {
  return ""
}

const initialState = {
  mediaType: "video" as MediaType,
  videoFeature: "reference-to-video",
  modelId: defaultModelId("video"),
  aspectRatio: "16:9",
  resolution: "480p",
  duration: "5s",
  count: 1,
  style: null,
  smartLyrics: true,
  prompt: "",
  references: [] as ReferenceAsset[],
  isGenerating: false,
  progress: 0,
  progressLabel: "",
  results: [] as GenerationResult[],
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  ...initialState,

  setMediaType: (type) =>
    set((state) => {
      // 切换媒体类型时重置模型与画幅默认值
      const modelId = modelsForMediaType(type).some((m) => m.id === state.modelId)
        ? state.modelId
        : defaultModelId(type)

      return {
        mediaType: type,
        modelId,
        aspectRatio: type === "audio" ? state.aspectRatio : type === "image" ? "16:9" : "16:9",
        duration: type === "audio" ? "15s" : "5s",
        resolution: type === "image" ? "1K" : "480p",
      }
    }),

  setVideoFeature: (videoFeature) => set({ videoFeature }),
  setModel: (modelId) => set({ modelId }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setResolution: (resolution) => set({ resolution }),
  setDuration: (duration) => set({ duration }),
  setCount: (count) => set({ count }),
  setStyle: (style) => set({ style }),
  setSmartLyrics: (smartLyrics) => set({ smartLyrics }),
  setPrompt: (prompt) => set({ prompt }),

  addReferences: (assets) =>
    set((state) => {
      const existing = new Set(state.references.map((r) => `${r.name}:${r.size ?? 0}`))
      const next = assets.filter((a) => !existing.has(`${a.name}:${a.size ?? 0}`))
      return { references: [...state.references, ...next].slice(0, 12) }
    }),

  removeReference: (id) =>
    set((state) => ({ references: state.references.filter((r) => r.id !== id) })),

  setGenerating: (value, progress = 0, progressLabel = "") =>
    set({ isGenerating: value, progress, progressLabel }),

  setProgress: (progress, progressLabel) =>
    set((state) => ({ progress, progressLabel: progressLabel ?? state.progressLabel })),

  addResult: (result) => set((state) => ({ results: [result, ...state.results].slice(0, 12) })),

  reset: () => set({ ...initialState, references: get().references }),
}))
