"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CREATION_CENTER_ITEMS } from "@/lib/constants"
import { resolveIcon } from "@/lib/icon-map"
import { cn } from "@/lib/utils"

/**
 * 创作中心下拉菜单。
 * 四个子产品：剧本工厂（新）/ 影视工厂 / 剧本创作 / 电商设计室。
 */
export function CreationCenterDropdown() {
  const pathname = usePathname()
  const active = pathname.startsWith("/creation")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="creation-center-trigger"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors outline-none",
            active
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
          )}
        >
          <SparklesIcon />
          <span>创作中心</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-zinc-500">
          选择创作线
        </DropdownMenuLabel>
        {CREATION_CENTER_ITEMS.map((item) => {
          const Icon = resolveIcon(item.icon)
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <DropdownMenuItem key={item.href} asChild className="p-0">
              <Link
                href={item.href}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-2 py-2",
                  isActive && "bg-zinc-800",
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950">
                  <Icon className="h-4 w-4 text-zinc-300" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-zinc-100">{item.label}</span>
                    {item.badge === "new" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-label="新功能" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SparklesIcon() {
  const Icon = resolveIcon("Sparkles")
  return <Icon className="h-4 w-4" />
}
