"use client"
import type { StoryboardDTO } from "./StoryboardCard"
import { Button } from "@/components/ui/button"

/**
 * 出片前检查（原型 image8）：
 * 顶部横幅「X 项必须先解决 · Y 项建议补齐」；
 * 必须解决（红，带跳转动作）/ 建议补齐（橙）/ 相邻段落衔接建议（带优先级 chips）。
 */
export function StoryboardChecks({
  items,
  aspectRatio = "16:9",
  onEdit,
  onGenerateImage,
  busy,
}: {
  items: StoryboardDTO[]
  aspectRatio?: string
  onEdit: (item: StoryboardDTO) => void
  onGenerateImage: (item: StoryboardDTO) => void
  busy: boolean
}) {
  const mustFix = items.filter(
    (item) =>
      !item.description.trim() ||
      !item.duration ||
      item.duration <= 0 ||
      item.status === "failed",
  )
  const suggestions = items.filter((item) => !item.imageUrl && !item.videoUrl)
  const transitions = items
    .slice(1)
    .map((item, index) => ({ previous: items[index]!, current: item }))
    .filter(
      (pair) =>
        pair.previous.shotType !== pair.current.shotType ||
        pair.previous.camera !== pair.current.camera,
    )
  const total = mustFix.length + suggestions.length + transitions.length
  if (total === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
        出片前检查 · 全部通过，可以批量生成
      </div>
    )
  }
  return (
    <div className="mb-3 space-y-2 text-xs">
      {/* 顶部横幅 */}
      <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        <span className="font-medium text-rose-300">
          出片前检查 · {mustFix.length > 0 && `${mustFix.length} 项必须先解决`}
          {mustFix.length > 0 && suggestions.length > 0 && " · "}
          {suggestions.length > 0 && `${suggestions.length} 项建议补齐`}
        </span>
        <span className="ml-auto text-[10px] text-zinc-500">
          当前画幅 {aspectRatio} · 分镜图可批量生成
        </span>
      </div>

      <details open={mustFix.length > 0} className="rounded-lg border border-zinc-800 bg-zinc-900/50">
        <summary className="cursor-pointer px-3 py-2 text-zinc-300">
          出片前检查 · 建议与问题
        </summary>
        <div className="space-y-2 border-t border-zinc-800 p-3">
          <p className="text-zinc-500">
            多段生成时：每段独立生成，锁住空间 / 调度 / 光影不漂移。同景别顺延优先「
            <span className="rounded bg-zinc-800 px-1">视频延长</span>」；跨空间 / 多人补「
            <span className="rounded bg-zinc-800 px-1">首帧图</span> +「
            <span className="rounded bg-zinc-800 px-1">调度图</span>」；换景只需「
            <span className="rounded bg-zinc-800 px-1">首帧图</span>」即可。
          </p>

          {mustFix.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded bg-rose-500/10 p-2"
            >
              <span className="text-rose-300">
                <span className="mr-1.5 rounded bg-rose-500/25 px-1 py-0.5 text-[10px] font-medium">
                  必须解决
                </span>
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

          {suggestions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded bg-orange-500/10 p-2"
            >
              <span className="text-orange-300">
                <span className="mr-1.5 rounded bg-orange-500/25 px-1 py-0.5 text-[10px] font-medium">
                  建议补齐
                </span>
                镜头 {item.number}：建议先出首帧图（{aspectRatio}，空空间 / 多人调度易穿帮）
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onGenerateImage(item)}
              >
                去补首帧图
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
                  className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-800 p-2 text-zinc-500"
                >
                  <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">
                    {pair.previous.number} → {pair.current.number}
                  </span>
                  <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">
                    {pair.previous.shotType === pair.current.shotType
                      ? "普通相接"
                      : "视频延长"}
                  </span>
                  锁住上一镜 endpoint 与人物初始位置，注意轴线与动作连续性。
                </p>
              ))}
            </>
          )}
        </div>
      </details>
    </div>
  )
}
