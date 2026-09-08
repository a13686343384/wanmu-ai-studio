"use client"

import { useEffect, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { StoryboardDTO } from "@/components/creation/film-factory/detail/StoryboardCard"

const SHOT_TYPES = ["远景", "全景", "中景", "近景", "特写", "过肩", "俯拍", "仰拍"]

/**
 * 分镜编辑抽屉。
 * 编辑镜头类型、描述、台词、动作、运镜、时长与生成提示词。
 */
export function StoryboardEditor({
  storyboard,
  open,
  onOpenChange,
  onSaved,
}: {
  storyboard: StoryboardDTO | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    shotType: "中景",
    description: "",
    dialogue: "",
    action: "",
    camera: "",
    duration: 3,
    prompt: "",
    negativePrompt: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!storyboard) return
    setForm({
      shotType: storyboard.shotType,
      description: storyboard.description,
      dialogue: storyboard.dialogue ?? "",
      action: storyboard.action ?? "",
      camera: storyboard.camera ?? "",
      duration: storyboard.duration ?? 3,
      prompt: storyboard.prompt ?? "",
      negativePrompt: storyboard.negativePrompt ?? "",
    })
  }, [storyboard])

  async function save() {
    if (!storyboard) return
    setSaving(true)
    try {
      const res = await fetch(`/api/storyboards/${storyboard.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shotType: form.shotType,
          description: form.description,
          dialogue: form.dialogue || null,
          action: form.action || null,
          camera: form.camera || null,
          duration: Number(form.duration) || 3,
          prompt: form.prompt || null,
          negativePrompt: form.negativePrompt || null,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "保存失败")
      toast.success("分镜已更新")
      onSaved()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            编辑分镜 {storyboard ? `#${storyboard.number}` : ""}
          </SheetTitle>
          <SheetDescription>修改镜头描述与生成提示词，保存后立即生效。</SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">镜头类型</Label>
            <Select
              value={form.shotType}
              onValueChange={(value) => setForm((f) => ({ ...f, shotType: value }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">镜头描述</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">台词</Label>
            <Textarea
              rows={2}
              value={form.dialogue}
              onChange={(event) => setForm((f) => ({ ...f, dialogue: event.target.value }))}
              className="text-xs"
              placeholder="留空表示无台词"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">动作</Label>
            <Textarea
              rows={2}
              value={form.action}
              onChange={(event) => setForm((f) => ({ ...f, action: event.target.value }))}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">运镜</Label>
              <Input
                value={form.camera}
                onChange={(event) => setForm((f) => ({ ...f, camera: event.target.value }))}
                className="h-8 text-xs"
                placeholder="如：缓慢推进"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">时长（秒）</Label>
              <Input
                type="number"
                min={0.5}
                max={120}
                step={0.5}
                value={form.duration}
                onChange={(event) =>
                  setForm((f) => ({ ...f, duration: Number(event.target.value) }))
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">生成提示词</Label>
            <Textarea
              rows={3}
              value={form.prompt}
              onChange={(event) => setForm((f) => ({ ...f, prompt: event.target.value }))}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">反向提示词</Label>
            <Textarea
              rows={2}
              value={form.negativePrompt}
              onChange={(event) => setForm((f) => ({ ...f, negativePrompt: event.target.value }))}
              className="text-xs"
            />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="brand" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
