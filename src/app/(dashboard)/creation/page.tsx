import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CREATION_CENTER_ITEMS } from "@/lib/constants"
import { resolveIcon } from "@/lib/icon-map"

export const metadata: Metadata = { title: "创作中心" }

/** 创作中心入口页：四条产品线总览。 */
export default function CreationCenterPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-6">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
        Creation Center
      </span>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">创作中心</h1>
      <p className="mt-1.5 text-sm text-zinc-500">
        四条创作线，覆盖从剧本到成片、从专业影视到电商素材的全部场景。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CREATION_CENTER_ITEMS.map((item) => {
          const Icon = resolveIcon(item.icon)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
                  <Icon className="h-4 w-4 text-zinc-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium text-zinc-100">{item.label}</h2>
                    {item.badge === "new" && (
                      <Badge variant="brand" className="font-normal">
                        新
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-400" />
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
