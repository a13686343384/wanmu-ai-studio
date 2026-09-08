"use client"

import { useState } from "react"
import { Check, Music2, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const BGM_PRESETS = [
  { id: "documentary", label: "纪录片解说", hint: "低频铺底 · 沉稳", bpm: "72 BPM" },
  { id: "tension", label: "紧张压迫", hint: "弦乐颤音 · 渐强", bpm: "96 BPM" },
  { id: "epic", label: "史诗热血", hint: "鼓点推进 · 铜管", bpm: "128 BPM" },
  { id: "melancholy", label: "忧郁抒情", hint: "钢琴单音 · 留白", bpm: "64 BPM" },
  { id: "scifi", label: "科幻氛围", hint: "合成器 · 空间感", bpm: "88 BPM" },
  { id: "suspense", label: "悬疑推理", hint: "拨弦 · 心跳律动", bpm: "104 BPM" },
] as const

/**
 * BGM 选择器。
 * 从预设风格中选择并试听，可调音量。
 */
export function BGMSelector({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [volume, setVolume] = useState([70])

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="flex items-center gap-2">
        <Music2 className="h-3.5 w-3.5 text-sky-400" />
        <h3 className="text-xs font-medium text-zinc-200">BGM 风格库</h3>
        <span className="ml-auto text-[10px] text-zinc-600">音量 {volume[0]}%</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {BGM_PRESETS.map((preset) => {
          const selected = value === preset.id
          return (
            <div
              key={preset.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                selected
                  ? "border-orange-500/50 bg-orange-500/[0.07]"
                  : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700",
              )}
            >
              <button
                type="button"
                onClick={() => onChange(selected ? null : preset.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-xs",
                      selected ? "text-orange-200" : "text-zinc-200",
                    )}
                  >
                    {preset.label}
                  </span>
                  {selected && <Check className="h-3 w-3 shrink-0 text-orange-400" />}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
                  {preset.hint} · {preset.bpm}
                </span>
              </button>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPreviewing(previewing === preset.id ? null : preset.id)}
                aria-label="试听"
              >
                {previewing === preset.id ? (
                  <Square className="h-3 w-3 text-orange-400" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
          )
        })}
      </div>

      {previewing && (
        <div className="flex items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2">
          <span className="flex h-6 items-end gap-0.5">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className="w-0.5 animate-pulse rounded-sm bg-sky-400"
                style={{
                  height: `${30 + ((index * 29) % 70)}%`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
            ))}
          </span>
          <span className="text-[11px] text-sky-200">
            试听中：{BGM_PRESETS.find((p) => p.id === previewing)?.label}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] text-zinc-400">音量</p>
        <Slider value={volume} onValueChange={setVolume} min={0} max={100} step={1} />
      </div>
    </div>
  )
}
