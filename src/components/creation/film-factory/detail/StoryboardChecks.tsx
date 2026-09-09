"use client"
import type { StoryboardDTO } from "./StoryboardCard"
import { Button } from "@/components/ui/button"
export function StoryboardChecks({
  items,
  onEdit,
  onGenerateImage,
  busy,
}: {
  items: StoryboardDTO[]
  onEdit: (item: StoryboardDTO) => void
  onGenerateImage: (item: StoryboardDTO) => void
  busy: boolean
}) {
  const invalid = items.filter(
    (item) =>
      !item.description.trim() ||
      !item.duration ||
      item.duration <= 0 ||
      item.status === "failed",
  )
  const missingImages = items.filter((item) => !item.imageUrl && !item.videoUrl)
  const transitions = items
    .slice(1)
    .map((item, index) => ({ previous: items[index]!, current: item }))
    .filter(
      (pair) =>
        pair.previous.shotType !== pair.current.shotType ||
        pair.previous.camera !== pair.current.camera,
    )
  return (
    <details className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/50 text-xs">
      <summary className="cursor-pointer p-3 text-zinc-300">
        <span>出片前检查</span>
        <span className="ml-3 text-orange-300">
          {invalid.length} 项需处理 · {missingImages.length} 项建议补图
        </span>
      </summary>
      <div className="space-y-2 border-t border-zinc-800 p-3">
        <p className="text-zinc-500">
          根据镜头描述、时长与产物状态检查；采用图生视频时应先补齐首帧图。
        </p>
        {!invalid.length && (
          <p className="text-zinc-400">镜头描述与时长完整，未发现失败状态。</p>
        )}
        {invalid.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded bg-red-500/10 p-2 text-red-300"
          >
            <span>
              镜头 {item.number}：
              {!item.description.trim()
                ? "缺少画面描述"
                : !item.duration || item.duration <= 0
                  ? "需填写有效时长"
                  : "上次生成失败，请检查后重试"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onEdit(item)}
            >
              编辑镜头
            </Button>
          </div>
        ))}
        {missingImages.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded bg-orange-500/10 p-2 text-orange-300"
          >
            <span>镜头 {item.number}：建议补充首帧图</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onGenerateImage(item)}
            >
              补首帧图
            </Button>
          </div>
        ))}
        {transitions.length > 0 && (
          <>
            <p className="pt-2 text-zinc-300">
              相邻镜头衔接 · {transitions.length} 处需人工确认
            </p>
            {transitions.map((pair) => (
              <p
                key={pair.current.id}
                className="rounded border border-zinc-800 p-2 text-zinc-500"
              >
                {pair.previous.number} → {pair.current.number}：
                {pair.previous.shotType}切换到{pair.current.shotType}
                ，请确认轴线、人物位置和动作连续性。
              </p>
            ))}
          </>
        )}
      </div>
    </details>
  )
}
