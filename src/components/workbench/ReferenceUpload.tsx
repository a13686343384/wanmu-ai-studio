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
 * 参考素材上传区。
 * 支持点击选择与拖拽上传，已上传素材以缩略图形式展示，可单独移除。
 */
export function ReferenceUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const references = useWorkbenchStore((s) => s.references)
  const addReferences = useWorkbenchStore((s) => s.addReferences)
  const removeReference = useWorkbenchStore((s) => s.removeReference)

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
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-2.5 transition-colors",
        dragging ? "border-orange-500 bg-orange-500/5" : "border-zinc-800 bg-zinc-900/40",
      )}
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

      <button
        type="button"
        data-testid="reference-upload"
        onClick={() => inputRef.current?.click()}
        className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-orange-500/60 hover:text-orange-400"
      >
        <Plus className="h-4 w-4" />
        <span className="text-[11px]">参考图</span>
      </button>

      {references.map((asset) => {
        const Icon = KIND_ICON[asset.kind]
        return (
          <div
            key={asset.id}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
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

      {references.length === 0 && (
        <p className="px-2 text-xs leading-relaxed text-zinc-600">
          上传参考图、参考视频或参考音频
          <br />
          可自由组合图、文、音、视频
        </p>
      )}
    </div>
  )
}
