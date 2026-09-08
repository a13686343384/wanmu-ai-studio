"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"
import type { EpisodeDTO } from "@/lib/serializers/script"

/** 把剧本正文按「【闪回】/【现实】」等标记着色。 */
function renderLines(content: string) {
  return content.split("\n").map((line, index) => {
    const tag = line.match(/^【(.+?)】/)
    if (!tag) {
      return (
        <p key={index} className="text-zinc-300">
          {line || "\u00A0"}
        </p>
      )
    }

    const label = tag[1]!
    const rest = line.replace(/^【.+?】/, "").trim()
    const isFlashback = /闪回|回忆/.test(label)

    return (
      <p key={index} className="flex gap-2">
        <span
          className={cn(
            "mt-0.5 h-fit shrink-0 rounded px-1 py-0.5 text-[10px]",
            isFlashback
              ? "bg-violet-500/15 text-violet-300"
              : "bg-sky-500/15 text-sky-300",
          )}
        >
          {label}
        </span>
        <span className="text-zinc-300">{rest || "\u00A0"}</span>
      </p>
    )
  })
}

/**
 * 剧本内容区（中栏上半部分）。
 * 展示当前分集的大纲摘要与正文，支持就地编辑并保存。
 */
export function ScriptContent({
  episode,
  onSaved,
}: {
  episode: EpisodeDTO | null
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(episode?.content ?? "")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(episode?.content ?? "")
    setEditing(false)
  }, [episode?.id, episode?.content])

  if (!episode) {
    return (
      <div className="flex h-full items-center p-6">
        <EmptyState
          size="compact"
          title="选择左侧分集查看剧本内容"
          className="h-full w-full justify-center border-none bg-transparent"
        />
      </div>
    )
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/episodes/${episode!.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: draft }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "保存失败")
      toast.success("已保存")
      setEditing(false)
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          剧本内容
        </span>
        <span className="text-[11px] text-zinc-600">
          EP{String(episode.number).padStart(2, "0")} · {episode.duration}s
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setDraft(episode.content)
                  setEditing(false)
                }}
              >
                取消
              </Button>
              <Button variant="brand" size="sm" className="h-7" onClick={() => void save()} disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                保存
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="h-7" onClick={() => setEditing(true)}>
              编辑
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {episode.summary && (
          <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              本集摘要
            </p>
            <p className="text-xs leading-relaxed text-zinc-400">{episode.summary}</p>
          </div>
        )}

        {editing ? (
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={18}
            className="min-h-[320px] font-mono text-xs leading-relaxed"
          />
        ) : (
          <div className="space-y-1.5 text-xs leading-relaxed">{renderLines(episode.content)}</div>
        )}
      </div>
    </div>
  )
}
