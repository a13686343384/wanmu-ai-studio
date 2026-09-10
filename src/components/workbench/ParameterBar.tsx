"use client"

import { Check, ChevronDown, Coins, Loader2, Zap } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ASPECT_RATIOS, DURATIONS, IMAGE_COUNTS, RESOLUTIONS } from "@/lib/constants"
import { formatNumber } from "@/lib/utils"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"
import { MediaTypeSelector } from "@/components/workbench/MediaTypeSelector"
import { FeatureSelector } from "@/components/workbench/FeatureSelector"
import { ModelSelector } from "@/components/workbench/ModelSelector"
import { StyleSelector } from "@/components/workbench/StyleSelector"

/**
 * 合并参数下拉：触发器形如「16:9 | 5s | 480p」（与设计稿一致），
 * 菜单内按 画幅 / 时长 / 分辨率 / 数量 分组，选项用多列网格控制高度。
 */
function CombinedParams() {
  const {
    mediaType,
    aspectRatio,
    resolution,
    duration,
    count,
    setAspectRatio,
    setResolution,
    setDuration,
    setCount,
  } = useWorkbenchStore()

  const segments: string[] = [aspectRatio]
  if (mediaType === "video") segments.push(duration)
  segments.push(resolution)
  if (mediaType === "image") segments.push(String(count))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="param-combined"
          aria-label="生成参数"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          {segments.map((segment, index) => (
            <span key={segment} className="flex items-center gap-1.5">
              {index > 0 && <span className="h-3 w-px bg-zinc-700" aria-hidden />}
              <span>{segment}</span>
            </span>
          ))}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-[16rem]"
        style={{ maxHeight: 340, overflowY: "auto" }}
      >
        <DropdownMenuLabel>画幅比例</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={aspectRatio}
          onValueChange={setAspectRatio}
          className="grid grid-cols-3 gap-1"
        >
          {ASPECT_RATIOS.map((ratio) => (
            <DropdownMenuRadioItem key={ratio.value} value={ratio.value} className="justify-center pl-2">
              {ratio.value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {mediaType === "video" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>时长</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={duration}
              onValueChange={setDuration}
              className="grid grid-cols-3 gap-1"
            >
              {DURATIONS.map((item) => (
                <DropdownMenuRadioItem key={item} value={item} className="justify-center pl-2">
                  {item}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>分辨率</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={resolution}
          onValueChange={setResolution}
          className="grid grid-cols-3 gap-1"
        >
          {RESOLUTIONS.map((item) => (
            <DropdownMenuRadioItem key={item} value={item} className="justify-center pl-2">
              {item}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {mediaType === "image" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>生成数量</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(count)}
              onValueChange={(value) => setCount(Number(value))}
              className="grid grid-cols-4 gap-1"
            >
              {IMAGE_COUNTS.map((item) => (
                <DropdownMenuRadioItem key={item} value={String(item)} className="justify-center pl-2">
                  {item}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** 音频模式的「智能歌词」选择。 */
function LyricsSelector() {
  const smartLyrics = useWorkbenchStore((s) => s.smartLyrics)
  const setSmartLyrics = useWorkbenchStore((s) => s.setSmartLyrics)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="lyrics-trigger"
          className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <Check className="h-3.5 w-3.5 text-orange-400" aria-hidden />
          {smartLyrics ? "智能歌词" : "纯音乐"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[8rem]">
        <DropdownMenuItem onSelect={() => setSmartLyrics(true)}>
          {smartLyrics && <Check className="h-3.5 w-3.5 text-orange-400" />}
          智能歌词
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setSmartLyrics(false)}>
          {!smartLyrics && <Check className="h-3.5 w-3.5 text-orange-400" />}
          纯音乐
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 参数控制栏：媒体类型 / 能力 / 模型 / 合并参数（图片模式含风格），
 * 右侧为积分消耗与「生成」主按钮。音频模式无合并参数，改为智能歌词选择。
 */
export function ParameterBar({ onGenerate }: { onGenerate: () => void }) {
  const { mediaType, modelId, count, isGenerating, prompt } = useWorkbenchStore()

  // cost 在 live 模式下由后端决定，此处仅展示 mock 模式的预估
  const cost = 0
  const canGenerate = prompt.trim().length > 0 && !isGenerating

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 px-3 py-2.5">
      <MediaTypeSelector />
      <FeatureSelector />
      <ModelSelector />

      {mediaType !== "audio" ? <CombinedParams /> : <LyricsSelector />}

      {mediaType === "image" && <StyleSelector />}

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{formatNumber(cost)}</span>
        </span>

        <Button
          variant="brand"
          size="sm"
          data-testid="generate"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Zap />}
          生成
        </Button>
      </div>
    </div>
  )
}
