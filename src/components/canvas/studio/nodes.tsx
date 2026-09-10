"use client"

import { useEffect, useRef, useState } from "react"
import {
  Handle,
  Position,
  useNodeId,
  useUpdateNodeInternals,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"
import {
  AudioLines,
  Box,
  Copy,
  Expand,
  Image as ImageIcon,
  Layers,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StudioComposer } from "./StudioComposer"
import { useStudio, type StudioNodeData } from "./types"
import { uploadStudioMedia } from "./upload"
import { useAiModels } from "@/hooks/useAiModels"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** 节点标题（节点上方的灰色小标签）。 */
function NodeLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-1 flex items-center gap-1 px-0.5 text-[11px] text-zinc-500">
      {icon}
      {text}
    </div>
  )
}

/** 左右两侧的 + 连接点。 */
function PlusHandles() {
  const id = useNodeId()
  const update = useUpdateNodeInternals()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!id || !ref.current?.parentElement) return
    const observer = new ResizeObserver(() => update(id))
    observer.observe(ref.current.parentElement)
    return () => observer.disconnect()
  }, [id, update])
  return (
    <div ref={ref}>
      <Handle
        type="target"
        position={Position.Left}
        className="studio-handle"
        aria-label="输入连接点"
      >
        <span>
          <Plus className="h-3 w-3" />
        </span>
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        className="studio-handle"
        aria-label="输出连接点"
      >
        <span>
          <Plus className="h-3 w-3" />
        </span>
      </Handle>
    </div>
  )
}

function useNodeActions(id: string) {
  const { deleteElements } = useReactFlow()
  function remove() {
    deleteElements({ nodes: [{ id }] })
  }
  return { remove }
}

/* ---------------------------- 文本节点 ---------------------------- */

export function StudioTextNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { updateNodeData } = useReactFlow()
  const { remove } = useNodeActions(id)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // 基于选区应用格式：有选区则包裹，无选区则对当前行加前缀
  function applyFormat(kind: "wrap" | "line" | "insert", marker: string, closeMarker?: string) {
    const el = taRef.current
    const value = d.text ?? ""
    if (!el) {
      updateNodeData(id, { text: value + marker })
      return
    }
    const s = el.selectionStart ?? value.length
    const e = el.selectionEnd ?? value.length

    if (kind === "wrap") {
      const next = value.slice(0, s) + marker + value.slice(s, e) + (closeMarker ?? "") + value.slice(e)
      updateNodeData(id, { text: next })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(s + marker.length, e + marker.length)
      })
      return
    }
    if (kind === "line") {
      const lineStart = value.lastIndexOf("\n", Math.max(s - 1, 0)) + 1
      updateNodeData(id, { text: value.slice(0, lineStart) + marker + value.slice(lineStart) })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(s + marker.length, s + marker.length)
      })
      return
    }
    // insert
    updateNodeData(id, { text: value.slice(0, s) + marker + value.slice(s) })
  }

  const formatActions = [
    { label: "H1", run: () => applyFormat("line", "# ") },
    { label: "H2", run: () => applyFormat("line", "## ") },
    { label: "H3", run: () => applyFormat("line", "### ") },
    { label: "❝", run: () => applyFormat("line", "> ") },
    { label: "B", run: () => applyFormat("wrap", "**", "**") },
    { label: "I", run: () => applyFormat("wrap", "*", "*") },
    { label: "•", run: () => applyFormat("line", "- ") },
    { label: "1.", run: () => applyFormat("line", "1. ") },
    { label: "—", run: () => applyFormat("insert", "\n---\n") },
  ]

  return (
    <div className="w-[380px]">
      <NodeLabel
        icon={<span className="font-serif text-[10px]">T</span>}
        text={d.label}
      />
      <div className="relative">
        <div
          className={cn(
            "rounded-xl border bg-zinc-900/80 p-3 transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          {selected && (
            <div className="mb-2 flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950/80 px-1 py-0.5">
              {formatActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    action.run()
                  }}
                  className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                >
                  {action.label}
                </button>
              ))}
              <span className="mx-0.5 h-3 w-px bg-zinc-800" />
              <button
                type="button"
                aria-label="复制文本"
                onClick={() => {
                  void navigator.clipboard.writeText(d.text ?? "")
                  toast.success("已复制文本")
                }}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="全屏编辑"
                onClick={() =>
                  toast.info("全屏编辑", {
                    description: "双击节点可直接编辑正文",
                  })
                }
                className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <Expand className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="删除节点"
                onClick={remove}
                className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          <textarea
            ref={taRef}
            value={d.text ?? ""}
            onChange={(event) =>
              updateNodeData(id, { text: event.target.value })
            }
            placeholder="开启你的创作…"
            rows={7}
            className="nodrag nowheel w-full resize-none rounded-lg bg-zinc-950/80 px-2.5 py-2 text-sm leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="text"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 图片节点 ---------------------------- */

export function StudioImageNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { updateNodeData } = useReactFlow()
  const { setSidebarTab, notify } = useStudio()
  const inputRef = useRef<HTMLInputElement>(null)
  const { projectId, beforeChange } = useStudio()

  return (
    <div className="w-[420px]">
      <NodeLabel icon={<ImageIcon className="h-3 w-3" />} text={d.label} />
      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-xl border transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          {d.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={d.url}
              alt={d.fileName ?? d.label}
              className="block w-full"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-zinc-900/80">
              <ImageIcon className="h-6 w-6 text-zinc-700" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200"
              >
                <Upload className="h-3 w-3" />
                本地上传
              </button>
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("assets")
                  notify("已切换到资产库", "在左侧选择素材即可引用")
                }}
                className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-200"
              >
                <Box className="h-3 w-3" />
                从资产库选择
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void uploadStudioMedia(projectId, file)
                .then((url) => {
                  beforeChange()
                  updateNodeData(id, { url, fileName: file.name })
                  toast.success("素材已上传")
                })
                .catch((error) =>
                  toast.error(
                    error instanceof Error ? error.message : "上传失败",
                  ),
                )
              event.target.value = ""
            }}
          />
        </div>

        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="image"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 视频节点 ---------------------------- */

/** 视频播放器：无原生 controls，点击画面播放/暂停（原生条会把拖动变成文件拖出）。 */
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={toggle}
        className="nodrag nowheel block aspect-video w-full cursor-pointer"
      />
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="播放"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg transition-transform hover:scale-105">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </button>
      )}
    </div>
  )
}

export function StudioVideoNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { updateNodeData } = useReactFlow()
  const inputRef = useRef<HTMLInputElement>(null)
  const { projectId, beforeChange } = useStudio()

  return (
    <div className="w-[420px]">
      <NodeLabel icon={<Video className="h-3 w-3" />} text={d.label} />
      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-xl border transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          {!d.url && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] text-zinc-300 hover:border-zinc-500"
            >
              <Upload className="h-3 w-3" />
              上传
            </button>
          )}

          {d.url ? (
            <VideoPlayer src={d.url} />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-zinc-900/80">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700">
                <Play className="h-4 w-4 text-zinc-600" />
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void uploadStudioMedia(projectId, file)
                .then((url) => {
                  beforeChange()
                  updateNodeData(id, { url, fileName: file.name })
                  toast.success("素材已上传")
                })
                .catch((error) =>
                  toast.error(
                    error instanceof Error ? error.message : "上传失败",
                  ),
                )
              event.target.value = ""
            }}
          />
        </div>

        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="video"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 音频节点 ---------------------------- */

export function StudioAudioNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { updateNodeData } = useReactFlow()
  const inputRef = useRef<HTMLInputElement>(null)
  const { projectId, beforeChange } = useStudio()

  return (
    <div className="w-[460px]">
      <NodeLabel icon={<AudioLines className="h-3 w-3" />} text={d.label} />
      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-xl border transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          {d.url ? (
            <div className="space-y-2 bg-zinc-900/80 p-3">
              <p className="truncate text-xs text-zinc-400">
                {d.fileName ?? "生成的音频"}
              </p>
              <audio src={d.url} controls className="nodrag nowheel w-full" />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center bg-zinc-900/80">
              <AudioLines className="h-6 w-6 text-zinc-700" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label="上传音频"
                className="ml-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200"
              >
                <Upload className="h-3 w-3" />
                上传音频
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void uploadStudioMedia(projectId, file)
                .then((url) => {
                  beforeChange()
                  updateNodeData(id, { url, fileName: file.name })
                  toast.success("素材已上传")
                })
                .catch((error) =>
                  toast.error(
                    error instanceof Error ? error.message : "上传失败",
                  ),
                )
              event.target.value = ""
            }}
          />
        </div>

        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="audio"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 导演台节点 ---------------------------- */

export function StudioDirectorNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { openDirectorDesk } = useStudio()

  return (
    <div className="w-[340px]">
      <NodeLabel icon={<Layers className="h-3 w-3" />} text={d.label} />
      <div className="relative">
        <div
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border bg-zinc-900/80 px-6 py-10 text-center transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          <Layers className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-200">
            在3D空间中搭建场景并进行多角度截图
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            连接 720 全景图节点作为场景背景
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDirectorDesk(id)}
          >
            打开导演台
          </Button>
        </div>

        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="text"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 动作导演节点 ---------------------------- */

import { useStudioRequest } from "./useStudioRequest"

const SCENE_TYPES = ["对打", "枪战", "清兵", "大场"] as const

export function StudioActionNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const meta = d.meta ?? {}
  const { updateNodeData, getNode } = useReactFlow()
  const request = useStudioRequest(id)
  const { models: videoModels } = useAiModels("video")
  const { models: textModels } = useAiModels("text")

  function patchMeta(patch: Partial<NonNullable<StudioNodeData["meta"]>>) {
    if (getNode(id))
      updateNodeData(id, {
        meta: {
          ...(getNode(id)?.data.meta as StudioNodeData["meta"]),
          ...patch,
        },
      })
  }

  const running = request.running

  async function orchestrate(mode: "detail" | "execute" | "run") {
    if (running) return
    const requirement = meta.requirement?.trim()
    if (!requirement) {
      toast.error("请先填写需求征集")
      return
    }
    const token = request.begin()
    if (!token) return
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: mode === "run" ? "video" : "text",
          aspectRatio: meta.outputAspect ?? "9:16",
          duration: `${meta.clipDuration ?? 15}s`,
          prompt: `动作导演·${meta.sceneType ?? "对打"}·${mode === "detail" ? "详细编排" : "执行编排"}：${requirement}`,
          modelId:
            mode === "run"
              ? (videoModels[0]?.id ?? "")
              : (d.modelId ?? textModels[0]?.id ?? ""),
          references: [],
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "编排失败")
      if (mode === "run" && getNode(id))
        updateNodeData(id, { url: payload.data.url })
      patchMeta({
        ...(mode === "run" ? {} : { plan: payload.data.text as string }),
        status: "done",
      })
      toast.success(
        mode === "run"
          ? "动作视频已生成"
          : mode === "detail"
            ? "详细编排已生成"
            : "执行编排已生成",
      )
      window.dispatchEvent(new CustomEvent("studio:generated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "编排失败")
    } finally {
      request.end(token)
    }
  }

  return (
    <div className="w-[360px]">
      <NodeLabel icon={<Box className="h-3 w-3" />} text={d.label} />
      <div className="relative">
        <div
          className={cn(
            "space-y-2.5 rounded-xl border bg-zinc-900/80 p-3 transition-colors",
            selected
              ? "border-zinc-400/70"
              : "border-zinc-800 hover:border-zinc-700",
          )}
        >
          <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/80 p-0.5">
            {SCENE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => patchMeta({ sceneType: type })}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[11px] transition-colors",
                  (meta.sceneType ?? SCENE_TYPES[0]) === type
                    ? "bg-orange-500/15 text-orange-300"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">需求征集</span>
              <span className="text-zinc-600">提示 @ 引用参考素材</span>
            </div>
            <textarea
              value={meta.requirement ?? ""}
              onChange={(event) =>
                patchMeta({ requirement: event.target.value })
              }
              rows={3}
              placeholder="例如：@主角 目标接近 @对手，利用空地位置贴近到对手身前，最后直发攻击动作并保证伤害轨迹准确"
              className="nodrag nowheel w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950/80 p-2 text-xs leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-700"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 py-1.5 text-[11px] text-zinc-400">
            识别历史优化
            <input
              type="checkbox"
              checked={meta.historyOptimize ?? true}
              onChange={(event) =>
                patchMeta({ historyOptimize: event.target.checked })
              }
              className="h-3.5 w-3.5 accent-orange-500"
            />
          </label>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-zinc-500">片段时长</span>
            <input
              type="number"
              min={5}
              max={60}
              value={meta.clipDuration ?? 15}
              onChange={(event) =>
                patchMeta({ clipDuration: Number(event.target.value) || 15 })
              }
              className="h-7 w-16 rounded-lg border border-zinc-700 bg-zinc-950/80 px-2 text-xs text-zinc-300 outline-none"
            />
            <span className="text-[11px] text-zinc-500">秒</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-zinc-500">通用模型</span>
            <Select
              value={d.modelId ?? "ovlm-6"}
              onValueChange={(value) => updateNodeData(id, { modelId: value })}
            >
              <SelectTrigger className="h-7 min-w-0 flex-1 text-[11px]" aria-label="通用模型">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ovlm-6">OVLM 6</SelectItem>
                <SelectItem value="ovlm-5.6">OVLM 5.6</SelectItem>
                <SelectItem value="gvlm-3.1-pro">GVLM 3.1 Pro</SelectItem>
              </SelectContent>
            </Select>
            <span className="shrink-0 text-[11px] text-zinc-500">输出画幅</span>
            <Select
              value={meta.outputAspect ?? "9:16"}
              onValueChange={(value) => patchMeta({ outputAspect: value })}
            >
              <SelectTrigger className="h-7 min-w-0 flex-1 text-[11px]" aria-label="输出画幅">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">竖屏 · 9:16</SelectItem>
                <SelectItem value="16:9">横屏 · 16:9</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] text-zinc-500">参考素材（已关联 0 项）</p>
            <p className="rounded-lg border border-dashed border-zinc-800 px-2 py-1.5 text-[10px] text-zinc-600">
              在需求里用 @ 引用画布上的素材，会自动出现在这里
            </p>
          </div>

          <p className="text-[10px] text-zinc-600">
            集号取最后依次点击执行编排组接
          </p>

          {d.url && (
            <video
              controls
              src={d.url}
              className="nodrag nowheel w-full rounded-lg"
            />
          )}
          {meta.plan && (
            <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950/80 p-2 text-[11px] leading-relaxed text-zinc-400">
              {meta.plan}
            </div>
          )}

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              disabled={running}
              onClick={() => void orchestrate("detail")}
            >
              详细编排
            </Button>
            <Button
              variant="brand"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              disabled={running}
              onClick={() => void orchestrate("execute")}
            >
              执行编排
            </Button>
            <Button
              variant="inverse"
              size="sm"
              className="h-7 flex-1 text-[11px]"
              disabled={running}
              onClick={() => void orchestrate("run")}
            >
              开跑生成
            </Button>
          </div>
        </div>

        <PlusHandles />
      </div>

      {selected && (
        <StudioComposer
          nodeId={id}
          kind="text"
          prompt={d.prompt}
          modelId={d.modelId}
        />
      )}
    </div>
  )
}

/* ---------------------------- 便签节点 ---------------------------- */

export function StudioStickyNode({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData
  const { updateNodeData } = useReactFlow()
  const { remove } = useNodeActions(id)

  return (
    <div className="w-[240px]">
      <NodeLabel
        icon={<span className="text-[10px]">🗒</span>}
        text={d.label}
      />
      <div className="relative">
        <div
          className={cn(
            "group rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 transition-colors",
            selected ? "border-amber-400/60" : "hover:border-amber-500/50",
          )}
        >
          <textarea
            value={d.text ?? ""}
            onChange={(event) =>
              updateNodeData(id, { text: event.target.value })
            }
            placeholder="写点备注…"
            rows={4}
            className="nodrag nowheel w-full resize-none rounded-lg bg-black/25 px-2.5 py-2 text-xs leading-relaxed text-amber-100/90 outline-none placeholder:text-amber-200/30"
          />
          <button
            type="button"
            aria-label="删除便签"
            onClick={remove}
            className="absolute right-1.5 top-1.5 rounded p-1 text-amber-200/40 opacity-0 transition-opacity hover:text-amber-200 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <PlusHandles />
      </div>
    </div>
  )
}
