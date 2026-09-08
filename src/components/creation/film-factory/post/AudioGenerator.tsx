"use client"

import { useState } from "react"
import { Loader2, Music, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { AUDIO_MODELS, DURATIONS } from "@/lib/constants"

/**
 * 配音 / 音乐生成器。
 * 输入风格描述，选择模型与时长，可选智能歌词。
 */
export function AudioGenerator({
  onGenerated,
  scriptId,
  episodeId,
}: {
  scriptId: string
  episodeId: string
  onGenerated: (audioUrl: string) => void
}) {
  const [prompt, setPrompt] = useState("沉稳大气的纪录片解说，男声，低频铺底，渐强收尾")
  const [model, setModel] = useState(AUDIO_MODELS[0]!.id)
  const [duration, setDuration] = useState("15s")
  const [smartLyrics, setSmartLyrics] = useState(true)
  const [running, setRunning] = useState(false)

  async function generate() {
    if (prompt.trim().length < 2) {
      toast.error("请先描述你想要的音乐 / 人声风格")
      return
    }

    setRunning(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}/episodes/${episodeId}/bgm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, model, duration, smartLyrics }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "生成失败")

      toast.success("音频已生成")
      onGenerated(payload.data.audioUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "生成失败")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="flex items-center gap-2">
        <Music className="h-3.5 w-3.5 text-violet-400" />
        <h3 className="text-xs font-medium text-zinc-200">配音 / 音乐生成</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-zinc-400">风格描述</Label>
        <Input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="描述你想要的音乐/人声风格"
          className="h-8 text-xs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">音频模型</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIO_MODELS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} 内置 · {item.cost} 起
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-zinc-400">时长</Label>
          <OptionPills
            options={DURATIONS.map((d) => ({ value: d, label: d }))}
            value={duration}
            onChange={setDuration}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
        <div>
          <p className="text-xs text-zinc-200">智能歌词</p>
          <p className="text-[11px] text-zinc-500">按剧情自动生成贴合情绪的歌词</p>
        </div>
        <Switch checked={smartLyrics} onCheckedChange={setSmartLyrics} />
      </div>

      <Button variant="brand" size="sm" className="w-full" onClick={() => void generate()} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
        生成音频
      </Button>
    </div>
  )
}
