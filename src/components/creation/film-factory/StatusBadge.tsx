"use client"

import { Badge } from "@/components/ui/badge"
import { SCRIPT_STATUS_COLOR, SCRIPT_STATUS_LABEL, type ScriptStatus } from "@/lib/constants"
import { cn } from "@/lib/utils"

/** 剧本状态徽章：按状态映射颜色与文案。 */
export function StatusBadge({
  status,
  processing,
  className,
}: {
  status: string
  processing?: string
  className?: string
}) {
  const key = (status in SCRIPT_STATUS_LABEL ? status : "intake") as ScriptStatus
  const label =
    processing === "processing" ? "处理中" : SCRIPT_STATUS_LABEL[key]

  return (
    <Badge
      variant="outline"
      className={cn("border font-normal", SCRIPT_STATUS_COLOR[key], className)}
    >
      {processing === "processing" && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </Badge>
  )
}
