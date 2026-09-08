"use client"

import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

/**
 * INTAKE 左栏：剧本原料。
 * 剧本标题 + 完整剧本正文，并给出分集标记格式说明。
 */
export function ScriptMaterialPanel({
  title,
  content,
  onTitleChange,
  onContentChange,
  errors,
}: {
  title: string
  content: string
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  errors?: { title?: string; content?: string }
}) {
  const charCount = content.length
  const episodeMarks = (content.match(/第\s*[0-9一二三四五六七八九十百]+\s*集/g) ?? []).length
  const separators = (content.match(/^\s*---\s*$/gm) ?? []).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-0.5 rounded bg-orange-500" />
        <h2 className="text-sm font-medium text-zinc-200">剧本原料</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="script-title">剧本标题</Label>
        <Input
          id="script-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例如：雪崩（影视）"
        />
        {errors?.title && <p className="text-xs text-rose-400">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <Label htmlFor="script-content">
            剧本内容 <span className="text-rose-400">*</span>
          </Label>
          <span className="text-[11px] text-zinc-600">
            {charCount.toLocaleString("zh-CN")} 字 · 识别到 {episodeMarks + separators} 个分集标记
          </span>
        </div>

        <Textarea
          id="script-content"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          rows={22}
          placeholder={"把你的完整剧本粘贴进来 —— 越完整 AI 判定越准。\n\n【分集格式 · 强烈推荐】想精确控制每集在哪切开，用下面任一种标记（不加也行，AI 会按时长均分）：\n\n方式一 · 集标题行\n第1集 重生归来\n……\n\n方式二 · 分隔线\n……\n---\n……"}
          className="min-h-[420px] resize-y font-mono text-xs leading-relaxed"
        />
        {errors?.content && <p className="text-xs text-rose-400">{errors.content}</p>}
      </div>

      <Alert variant="info">
        <Info />
        <AlertDescription className="text-xs leading-relaxed">
          想精确分集就在原文里标「第N集」或用 <code className="rounded bg-zinc-800 px-1">---</code>{" "}
          分隔线，AI 会按标记数定集数、严格按标记切；不标则按时长均分。
          <br />
          AI 还会自动推断时代 / 题材 / 视觉风格 / 服化道。
        </AlertDescription>
      </Alert>
    </div>
  )
}
