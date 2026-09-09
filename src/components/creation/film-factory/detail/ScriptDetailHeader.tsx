"use client"

import Link from "next/link"
import { ArrowLeft, Image as ImageIcon, MoreVertical, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/creation/film-factory/StatusBadge"
import { WORK_TYPES } from "@/lib/constants"
import type { ScriptDetail } from "@/lib/serializers/script"

const WORK_TYPE_LABEL = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

/**
 * 剧本详情页顶部栏（沉浸式布局，替代全局导航）。
 * 返回 / 标题 + 加工方式标签 + 查看全部信息；右侧为会诊、生成封面、状态与更多操作。
 */
export function ScriptDetailHeader({
  script,
  onConsult,
  onGenerateCover,
  onRefresh,
  onInfo,
}: {
  script: ScriptDetail
  onConsult: () => void
  onGenerateCover: () => void
  onRefresh?: () => void
  onInfo: () => void
}) {
  const mustFix = script.consultations[0]?.suggestions?.filter((s) => s.mustFix).length ?? 0

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-zinc-950 px-4 py-2.5">
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-zinc-400" asChild>
        <Link href="/creation/film-factory">
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </Link>
      </Button>
      <span className="text-zinc-700" aria-hidden>
        /
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={`/creation/film-factory/${script.id}`}
          className="max-w-[280px] truncate text-sm font-medium text-zinc-100"
        >
          {script.title}
        </Link>
        <Badge variant="muted" className="h-5 font-normal">
          {WORK_TYPE_LABEL[script.workType] ?? script.workType}
        </Badge>
        <Badge variant="muted" className="hidden h-5 font-normal sm:inline-flex">
          {script.processingMode === "consult_optimize" ? "会诊+台词优化(推荐)" : "原样保留"}
        </Badge>
        <Badge variant="muted" className="hidden h-5 font-normal md:inline-flex">
          {script.executionMode === "step_by_step" ? "逐步确认(推荐)" : "全自动一步到位"}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          className="hidden h-7 px-2 text-xs text-zinc-500 lg:inline-flex"
          onClick={onInfo}
        >
          查看全部信息
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          onClick={onConsult}
        >
          会诊
          {mustFix > 0 && (
            <span className="ml-0.5 rounded bg-rose-500/15 px-1 text-[10px] text-rose-300">
              必改 {mustFix}
            </span>
          )}
        </Button>

        <Button variant="outline" size="sm" className="h-8" onClick={onGenerateCover}>
          <ImageIcon className="h-3.5 w-3.5" />
          生成封面
        </Button>

        <StatusBadge status={script.status} processing={script.processingStatus} />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="刷新剧本"
          className="hidden sm:inline-flex"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="更多操作">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/canvas">打通到画布</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onInfo}>查看全部信息</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>导出剧本</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
