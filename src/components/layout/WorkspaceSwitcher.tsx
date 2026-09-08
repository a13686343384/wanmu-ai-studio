"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Crown, Plus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface WorkspaceSummary {
  id: string
  name: string
  description: string | null
  isPersonal: boolean
  role: string
  memberCount: number
  projectCount: number
  scriptCount: number
}

const ACTIVE_KEY = "wanmusheng:active-workspace"

/**
 * 工作区切换器。
 * 展示当前工作区名称，下拉可切换个人/团队工作区。
 */
export function WorkspaceSwitcher({
  onCreateTeam,
  onJoinTeam,
}: {
  onCreateTeam?: () => void
  onJoinTeam?: () => void
}) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((payload: { data?: WorkspaceSummary[] }) => {
        if (cancelled || !payload.data) return
        setWorkspaces(payload.data)

        const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null
        const valid = stored && payload.data.some((w) => w.id === stored)
        const next = valid ? stored : (payload.data[0]?.id ?? null)
        setActiveId(next)
        if (next && typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, next)
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  function select(id: string) {
    setActiveId(id)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_KEY, id)
      window.dispatchEvent(new CustomEvent("wanmusheng:workspace-change", { detail: id }))
    }
  }

  if (workspaces === null) {
    return <Skeleton className="h-7 w-36" />
  }

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="truncate">{active?.name ?? "我的工作区"}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>切换工作区</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => select(w.id)} className="justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold",
                  w.isPersonal
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-violet-500/20 text-violet-300",
                )}
              >
                {w.isPersonal ? "个" : "团"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{w.name}</span>
                <span className="block text-[11px] text-zinc-500">
                  {w.isPersonal ? "个人空间" : `${w.memberCount} 位成员`} · {w.projectCount} 项目
                </span>
              </span>
            </span>
            {w.id === active?.id && <Check className="h-3.5 w-3.5 text-orange-400" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="grid grid-cols-2 gap-1.5 p-1">
          <Button size="sm" variant="outline" className="w-full" onClick={onCreateTeam}>
            <Plus />
            新建团队
          </Button>
          <Button size="sm" variant="outline" className="w-full" onClick={onJoinTeam}>
            <UserPlus />
            加入团队
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
