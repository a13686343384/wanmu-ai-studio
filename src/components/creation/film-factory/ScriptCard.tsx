"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Pin, PinOff, Trash2, Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/creation/film-factory/StatusBadge"
import { WORK_TYPES, WORKFLOW_STAGES } from "@/lib/constants"
import type { ScriptSummary } from "@/lib/serializers/script"

const WORK_TYPE_LABEL = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

/** 顶部场记板斜纹：制作中琥珀、待推进天蓝、已完成中性。 */
function ClapperStripe({ tone }: { tone: "processing" | "ready" | "done" }) {
  const color =
    tone === "processing" ? "#f59e0b" : tone === "ready" ? "#38bdf8" : "#52525b"

  return (
    <div
      aria-hidden
      className={`h-2.5 w-full ${tone === "processing" ? "animate-pulse" : ""}`}
      style={{
        backgroundImage: `repeating-linear-gradient(-45deg, ${color} 0 9px, transparent 9px 18px)`,
        opacity: tone === "done" ? 0.4 : 0.75,
      }}
    />
  )
}

/**
 * 影视工厂剧本卡片（场记板风格）。
 * 顶部斜纹 + 剧本编号/日期 + 标题与状态 + 简介 + 工序点 + 集数与时长。
 */
export function ScriptCard({
  script,
  pinned,
  onTogglePin,
  onEdit,
  onDelete,
  onResumeIntake,
}: {
  script: ScriptSummary
  pinned?: boolean
  onTogglePin?: (script: ScriptSummary) => void
  onEdit?: (script: ScriptSummary) => void
  onDelete: (script: ScriptSummary) => void
  /** 建档中的剧本点击时恢复 INTAKE 弹窗 */
  onResumeIntake?: (script: ScriptSummary) => void
}) {
  const router = useRouter()
  const processing = script.processingStatus === "processing"
  const done = script.status === "completed"
  const tone: "processing" | "ready" | "done" = processing ? "processing" : done ? "done" : "ready"

  const stageIndex = WORKFLOW_STAGES.findIndex((stage) => stage.key === script.status)

  // 整卡可点：建档中→恢复弹窗；其他→进详情
  function openDetail(event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("button, a, [role='menuitem']")) return
    if (processing && onResumeIntake) {
      onResumeIntake(script)
    } else {
      router.push(`/creation/film-factory/${script.id}`)
    }
  }

  return (
    <div
      onClick={openDetail}
      className="group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 transition-all duration-200 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.85)]"
    >
      <ClapperStripe tone={tone} />

      <div className="space-y-2.5 p-3.5">
        {/* 编号 + 日期 */}
        <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-zinc-500">
          <span>SC-{script.id.slice(-4).toUpperCase()}</span>
          <span>{script.createdAt.slice(0, 10)}</span>
        </div>

        {/* 标题 + 状态 + 操作 */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/creation/film-factory/${script.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100 hover:text-orange-300"
          >
            {script.title}
          </Link>

          <StatusBadge status={script.status} processing={script.processingStatus} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="更多操作"
                className="-mr-1.5 -mt-1 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onTogglePin?.(script)}>
                {pinned ? <PinOff /> : <Pin />}
                {pinned ? "取消置顶" : "置顶"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit?.(script)}>
                <Pencil />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => onDelete(script)}>
                <Trash2 />
                删除剧本
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 简介 */}
        <p className="line-clamp-1 text-xs text-zinc-500">{script.synopsis || "暂无简介"}</p>

        {/* 工序 */}
        <div className="space-y-1.5 border-t border-zinc-800/80 pt-2.5">
          <span className="text-[10px] text-zinc-600">工序</span>
          <div className="flex items-center gap-1.5" aria-label={`工序进度：${stageIndex + 1}/${WORKFLOW_STAGES.length}`}>
            {WORKFLOW_STAGES.map((stage, index) => {
              const reached = index <= stageIndex
              const current = index === stageIndex && !done
              return (
                <span
                  key={stage.key}
                  title={stage.label}
                  className={`h-1.5 w-1.5 rounded-full ${
                    reached
                      ? current
                        ? "animate-pulse bg-sky-400"
                        : "bg-emerald-400"
                      : "bg-zinc-700"
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* 集数 + 类型 + 时长 */}
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-1.5">
            <span className="text-xl font-semibold leading-none tabular-nums text-zinc-100">
              {script.episodeCount || script.totalEpisodes}
            </span>
            <span className="text-xs text-zinc-500">集</span>
            <span className="ml-1 rounded border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-400">
              {WORK_TYPE_LABEL[script.workType] ?? script.workType} ·{" "}
              {script.seriesType === "limited" ? "限定剧" : "连载剧"}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">{script.episodeDuration}s/集</span>
        </div>
      </div>
    </div>
  )
}
