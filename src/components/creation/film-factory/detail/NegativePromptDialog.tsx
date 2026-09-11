"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

/**
 * 视频禁止项 · 反向提示词弹窗（原型图39）。
 * 剧本级全局反向提示词，每次出视频时 LLM 会把这些当硬规则严格规避。
 */
export function NegativePromptDialog({
  open,
  onOpenChange,
  scriptId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  scriptId: string
}) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !scriptId) return
    fetch(`/api/scripts/${scriptId}`)
      .then((r) => r.json())
      .then((d) => setText(d.data?.negativePrompt ?? ""))
      .catch(() => {})
  }, [open, scriptId])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ negativePrompt: text }),
      })
      if (!res.ok) throw new Error("保存失败")
      toast.success("禁止项已保存")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>视频禁止项 · 反向提示词</DialogTitle>
          <DialogDescription className="leading-relaxed">
            统一写「不要什么」（如 不要背景音乐、不要字幕、不要旁白、不要镜头切换…）。本剧每次出视频前编提示词时，LLM
            会把这些当<strong>硬规则</strong>严格规避。剧本级，只影响本剧。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "每行一条，例如：\n不要背景音乐/BGM\n不要字幕、不要旁白\n不要无意义的镜头切换"
          }
          className="text-xs"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="inverse" disabled={saving} onClick={() => void save()}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
