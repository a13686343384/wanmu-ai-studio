"use client"

import { useRef, useState } from "react"
import { FileAudio, FileVideo, ImageIcon, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbenchStore, type ReferenceAsset } from "@/stores/useWorkbenchStore"

const MAX_FILES = 12
const ACCEPT = "image/*,video/*,audio/*"

function kindOf(file: File): ReferenceAsset["kind"] {
  if (file.type.startsWith("video")) return "video"
  if (file.type.startsWith("audio")) return "audio"
  return "image"
}

const KIND_ICON = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
} as const

/**
 * 参考素材上传入口：面板左侧的虚线方块（拖拽 / 点击上传）。
 * 已上传素材由 `ReferenceThumbnails` 在提示词下方展示。
 */
export function ReferenceUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const references = useWorkbenchStore((s) => s.references)
  const addReferences = useWorkbenchStore((s) => s.addReferences)
  const mediaType = useWorkbenchStore((s) => s.mediaType)

  function ingest(files: FileList | File[]) {
    const list = Array.from(files).slice(0, MAX_FILES - references.length)
    const assets: ReferenceAsset[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      kind: kindOf(file),
      size: file.size,
    }))
    addReferences(assets)
  }

  return (
    <div
      data-testid="reference-upload"
      role="button"
      tabIndex={0}
      aria-label="上传参考素材"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (event.dataTransfer.files.length) ingest(event.dataTransfer.files)
      }}
      className={cn(
        "flex h-[84px] w-[84px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 self-start rounded-lg border border-dashed transition-colors",
        dragging
          ? "border-orange-500 bg-orange-500/5 text-orange-400"
          : "border-zinc-700 bg-zinc-900/40 text-zinc-500 hover:border-orange-500/60 hover:text-orange-400",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) ingest(event.target.files)
          event.target.value = ""
        }}
      />

      <Plus className="h-4 w-4" />
      <span className="px-1 text-center text-[11px] leading-tight">
        {mediaType === "image" ? "参考图" : "参考内容"}
      </span>
    </div>
  )
}

/** 已上传参考素材的缩略图行（空时不渲染）。 */
export function ReferenceThumbnails() {
  const references = useWorkbenchStore((s) => s.references)
  const removeReference = useWorkbenchStore((s) => s.removeReference)

  if (references.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 border-t border-zinc-800/60 px-3 pb-2.5 pt-2">
      {references.map((asset) => {
        const Icon = KIND_ICON[asset.kind]
        return (
          <div
            key={asset.id}
            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
          >
            {asset.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={asset.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate px-1 text-[10px]">
                  {asset.kind === "video" ? "视频" : "音频"}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => removeReference(asset.id)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-zinc-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
              aria-label={`移除 ${asset.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
