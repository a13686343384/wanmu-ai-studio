"use client"

import { useState } from "react"
import { Loader2, Save, Sparkles, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { ScriptDetail } from "@/lib/serializers/script"

export interface PacingProfile {
  platforms?: string[]
  cadence?: string
  intensity?: string
  first3?: string
  first15?: string
  first30?: string
  suspense?: string
  blank?: string
  ending?: string
}

const PLATFORMS = ["抖音", "快手", "小红书", "视频号", "B站", "淘宝"]

/**
 * 平台节奏档案（查看全部信息弹窗底部入口）。
 * 按作品类型自动派生：调 /api/ai/generate 生成各字段建议回填；保存写入剧本。
 */
export function PacingProfileDialog({
  open,
  onOpenChange,
  script,
  value,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: ScriptDetail
  value: PacingProfile | null
  onSave: (profile: PacingProfile) => void
}) {
  const [profile, setProfile] = useState<PacingProfile>(value ?? {})
  const [deriving, setDeriving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState("")

  function patch(next: Partial<PacingProfile>) {
    setProfile((current) => ({ ...current, ...next }))
  }

  async function derive() {
    setDeriving(true)
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "text",
          modelId: "ovlm-6",
          prompt: [
            `为「${script.title}」（${script.genre ?? "短剧"}，${script.totalEpisodes} 集 × ${script.episodeDuration}s）按作品类型自动派生平台节奏档案，输出 JSON：`,
            '{"platforms":string[],"cadence":string,"intensity":string,"first3":string,"first15":string,"first30":string,"suspense":string,"blank":string,"ending":string}',
          ].join("\n"),
          references: [],
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "派生失败")
      const match = String(payload.data.text).match(/\{[\s\S]*\}/)
      if (!match) throw new Error("未能解析派生结果")
      const parsed = JSON.parse(match[0]) as PacingProfile
      setProfile((current) => ({ ...current, ...parsed }))
      toast.success("已按作品类型派生节奏档案")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "派生失败")
    } finally {
      setDeriving(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pacingProfile: profile }),
      })
      if (!res.ok) {
        const payload = await res.json()
        throw new Error(payload.error ?? "保存失败")
      }
      toast.success("节奏档案已保存")
      onSave(profile)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const FIELDS: { key: keyof PacingProfile; label: string; placeholder: string }[] = [
    { key: "cadence", label: "直播节奏", placeholder: "8/16，21/9，219/71" },
    { key: "intensity", label: "节奏强度", placeholder: "高强度/中高强度/中低强度/弱情节强信息" },
    { key: "first3", label: "前 3 秒任务", placeholder: "强钩子/冲突钩子/情感钩子/人物反差" },
    { key: "first15", label: "前 15 秒推进", placeholder: "推进/反转/疑引人/人物滤镜" },
    { key: "first30", label: "前 30 秒任务", placeholder: "一次有效信息增量/情绪推进/关系变化" },
    { key: "suspense", label: "悬念布局", placeholder: "哪些位置允许草、允许多久、为什么留得住" },
    { key: "blank", label: "留白要求", placeholder: "哪个允许钩/线索/线没锁着看多久" },
    { key: "ending", label: "完结目标", placeholder: "留住用户继续看/评论/转发/进入下一集的理由" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-orange-400" />
            平台节奏档案
          </DialogTitle>
          <DialogDescription>
            按发布平台与作品类型预设直播节奏 / 节奏强度 / 分段任务 / 悬念与留白；编剧写作与拆分镜都会参照这套档案执行。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>发布平台</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {PLATFORMS.map((name) => {
                const active = profile.platforms?.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      patch({
                        platforms: active
                          ? (profile.platforms ?? []).filter((p) => p !== name)
                          : [...(profile.platforms ?? []), name],
                      })
                    }
                    className={
                      active
                        ? "rounded-lg border border-orange-500/60 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-300"
                        : "rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    }
                  >
                    {name}
                  </button>
                )
              })}
              <div className="flex items-center gap-1">
                <Input
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  placeholder="自定义平台"
                  className="h-7 w-28 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={!platform.trim()}
                  onClick={() => {
                    if (!platform.trim()) return
                    patch({ platforms: [...(profile.platforms ?? []), platform.trim()] })
                    setPlatform("")
                  }}
                >
                  添加
                </Button>
              </div>
            </div>
          </div>

          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Textarea
                rows={2}
                value={profile[field.key] ?? ""}
                onChange={(event) => patch({ [field.key]: event.target.value } as Partial<PacingProfile>)}
                placeholder={field.placeholder}
                className="text-xs"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => void derive()} disabled={deriving}>
            {deriving ? <Loader2 className="animate-spin" /> : <Sparkles />}
            按作品类型自动派生
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              取消
            </Button>
            <Button variant="inverse" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
