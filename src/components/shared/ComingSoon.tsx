import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Construction } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * 「即将上线」占位页。
 * 用于产品线中尚未进入开发排期的模块，保证导航可达且信息清晰。
 */
export function ComingSoon({
  title,
  subtitle,
  description,
  icon: Icon,
  highlights,
  cta,
}: {
  title: string
  subtitle?: string
  description: string
  icon: LucideIcon
  highlights?: string[]
  cta?: { label: string; href: string }
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <Icon className="h-6 w-6 text-orange-400" />
      </span>

      {subtitle && (
        <span className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          {subtitle}
        </span>
      )}

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>

      <Badge variant="warning" className="mt-3 font-normal">
        <Construction className="mr-1 h-3 w-3" />
        即将上线
      </Badge>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">{description}</p>

      {highlights && highlights.length > 0 && (
        <ul className="mt-5 w-full max-w-md space-y-2 text-left">
          {highlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {cta && (
        <Button variant="inverse" className="mt-6" asChild>
          <Link href={cta.href}>
            {cta.label}
            <ArrowRight />
          </Link>
        </Button>
      )}
    </main>
  )
}
