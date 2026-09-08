"use client"

import { ChevronDown, Coins, Loader2, Zap } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ASPECT_RATIOS, DURATIONS, IMAGE_COUNTS, RESOLUTIONS } from "@/lib/constants"
import { formatNumber } from "@/lib/utils"
import { modelsForMediaType, useWorkbenchStore } from "@/stores/useWorkbenchStore"
import { MediaTypeSelector } from "@/components/workbench/MediaTypeSelector"
import { FeatureSelector } from "@/components/workbench/FeatureSelector"
import { ModelSelector } from "@/components/workbench/ModelSelector"
import { StyleSelector } from "@/components/workbench/StyleSelector"

/** 通用的小型下拉按钮。 */
function ParamSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: readonly (string | number)[]
  onSelect: (value: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          aria-label={label}
        >
          {value}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[7rem]">
        {options.map((option) => (
          <DropdownMenuItem key={String(option)} onSelect={() => onSelect(String(option))}>
            {String(option)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 参数控制栏：媒体类型 / 能力 / 模型 / 画幅 / 时长 / 分辨率 / 数量 / 风格，
 * 右侧为积分消耗与「生成」主按钮。
 */
export function ParameterBar({ onGenerate }: { onGenerate: () => void }) {
  const {
    mediaType,
    aspectRatio,
    resolution,
    duration,
    count,
    modelId,
    isGenerating,
    prompt,
    setAspectRatio,
    setResolution,
    setDuration,
    setCount,
  } = useWorkbenchStore()

  const model = modelsForMediaType(mediaType).find((m) => m.id === modelId)
  const cost = (model?.cost ?? 0) * (mediaType === "image" ? count : 1)
  const canGenerate = prompt.trim().length > 0 && !isGenerating

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 px-3 py-2.5">
      <MediaTypeSelector />
      <FeatureSelector />
      <ModelSelector />

      <span className="mx-0.5 h-4 w-px bg-zinc-800" />

      {mediaType !== "audio" && (
        <ParamSelect
          label="画幅比例"
          value={aspectRatio}
          options={ASPECT_RATIOS.map((r) => r.value)}
          onSelect={setAspectRatio}
        />
      )}

      {mediaType === "video" && (
        <ParamSelect
          label="时长"
          value={duration}
          options={DURATIONS}
          onSelect={setDuration}
        />
      )}

      <ParamSelect
        label="分辨率"
        value={resolution}
        options={RESOLUTIONS}
        onSelect={setResolution}
      />

      {mediaType === "image" && (
        <ParamSelect
          label="生成数量"
          value={String(count)}
          options={IMAGE_COUNTS}
          onSelect={(value) => setCount(Number(value))}
        />
      )}

      <StyleSelector />

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{formatNumber(cost)}</span>
        </span>

        <Button variant="brand" size="sm" onClick={onGenerate} disabled={!canGenerate}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <Zap />}
          生成
        </Button>
      </div>
    </div>
  )
}
