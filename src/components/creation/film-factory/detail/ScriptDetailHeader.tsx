"use client"

import Link from "next/link"
import { ArrowLeft, Clapperboard, Crown, Image as ImageIcon, MoreVertical } from "lucide-react"
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
 * 剧本详情页顶部栏。
 * 返回、标题、关键状态徽章、会诊入口、生成封面与更多操作。
 */
export function ScriptDetailHeader({
  script,
  onConsult,
  onGenerateCover,
}: {
  script: ScriptDetail
  onConsult: () => void
  onGenerateCover: () => void
}) {
  const mustFix = script.consultations[0]?.suggestions?.filter((s) => s.mustFix).length ?? 0

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-zinc-950 px-4 py-2.5">
      <Button variant="ghost" size="icon-sm" asChild aria-label="返回影视工厂">
        <Link href="/creation/film-factory">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-sm font-medium text-zinc-100">{script.title}</h1>
          <StatusBadge status={script.status} processing={script.processingStatus} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Crown className="h-3 w-3 text-amber-400" />
          <span>{script.workspaceName}</span>
          <span className="text-zinc-700">·</span>
          <span>{WORK_TYPE_LABEL[script.workType] ?? script.workType}</span>
          <span className="text-zinc-700">·</span>
          <span>{script.totalEpisodes} 集</span>
          <span className="text-zinc-700">·</span>
          <span>{script.episodeDuration}s/集</span>
          {script.genre && (
            <>
              <span className="text-zinc-700">·</span>
              <Badge variant="muted" className="h-4 font-normal">
                {script.genre}
              </Badge>
            </>
          )}
        </div>
      </div>

      <Button variant="outline" size="sm" className="h-8" onClick={onConsult}>
        <Clapperboard className="h-3.5 w-3.5" />
        剧本会诊
        {mustFix > 0 && (
          <span className="ml-0.5 rounded bg-rose-500/15 px-1 text-[10px] text-rose-300">
            必改 {mustFix}
          </span>
        )}
      </Button>

      <Button variant="ghost" size="sm" className="h-8" onClick={onGenerateCover}>
        <ImageIcon className="h-3.5 w-3.5" />
        生成封面
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
          <DropdownMenuItem asChild>
            <Link href={`/creation/film-factory/${script.id}`}>查看全部信息</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>导出剧本</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
