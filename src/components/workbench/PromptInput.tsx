"use client"

import { useRef, useState } from "react"
import { AtSign, ImageIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWorkbenchStore } from "@/stores/useWorkbenchStore"

const PLACEHOLDER: Record<string, string> = {
  video:
    "上传参考素材、输入文字或 @ 引用内容，自由组合图、文、音、视频多元素，定义精彩互动。例如：@图片1 模仿 @视频1 的动作，音色参考 @音频1。",
  image: "上传参考图、输入文字，或 @ 引用已上传的图片，让 AI 参考它生成。例如：@图片1 换成赛博朋克风格。",
  audio: "描述你想要的音乐 / 人声风格。例如：沉稳大气的纪录片解说，男声…",
}

/**
 * 提示词输入框。
 * 支持 `@` 唤起已上传素材列表，点击即可把引用插入文本。
 */
export function PromptInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)

  const mediaType = useWorkbenchStore((s) => s.mediaType)
  const prompt = useWorkbenchStore((s) => s.prompt)
  const setPrompt = useWorkbenchStore((s) => s.setPrompt)
  const references = useWorkbenchStore((s) => s.references)

  function insertMention(name: string) {
    const next = `${prompt}${prompt && !prompt.endsWith(" ") ? " " : ""}@${name} `
    setPrompt(next)
    setMentionOpen(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="relative min-w-0 flex-1">
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(event) => {
          const value = event.target.value
          setPrompt(value)
          // 以 @ 结尾时唤起素材列表
          if (value.endsWith("@")) setMentionOpen(true)
        }}
        rows={3}
        placeholder={PLACEHOLDER[mediaType]}
        className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
      />

      {/* @ 引用入口：点击或输入 @ 均可唤起 */}
      <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-orange-400"
            aria-label="引用素材"
          >
            <AtSign className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
          {references.length === 0 ? (
            <p className="px-2 py-3 text-xs text-zinc-500">
              还没有上传素材，先在左侧上传参考图 / 视频 / 音频
            </p>
          ) : (
            references.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => insertMention(asset.name)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950">
                  <ImageIcon className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1 truncate">{asset.name}</span>
                <span className="text-zinc-600">@{index + 1}</span>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
