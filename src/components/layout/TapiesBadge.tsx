"use client"

import { Coins, Crown } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { formatNumber } from "@/lib/utils"

/** 积分（Tapies）余额展示。 */
export function TapiesBadge() {
  const tapies = useAuthStore((s) => s.tapies)

  return (
    <div
      className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-amber-300"
      title="Tapies 积分余额"
    >
      <Coins className="h-3.5 w-3.5" />
      <span className="font-medium tabular-nums">{formatNumber(tapies)}</span>
    </div>
  )
}

/** 会员升级入口。 */
export function UpgradeButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/10"
      title="升级会员，解锁更高配额与并发"
    >
      <Crown className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">会员升级</span>
    </button>
  )
}
