import type { Metadata } from "next"
import Link from "next/link"
import { APP_NAME, APP_NAME_CN } from "@/lib/constants"

export const metadata: Metadata = {
  title: "登录",
}

/**
 * 认证页布局：左右分栏。
 * 左侧为品牌展示（渐变光晕 + 产品卖点），右侧为表单。
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* 品牌侧 */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-zinc-900 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-orange-600/20 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 right-0 h-[380px] w-[380px] rounded-full bg-amber-500/10 blur-[120px]"
        />

        <Link href="/" className="relative flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white">
            M
          </span>
          <span className="text-base font-semibold tracking-tight">
            {APP_NAME}
            <span className="ml-2 text-xs font-normal text-zinc-500">{APP_NAME_CN}</span>
          </span>
        </Link>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-semibold leading-snug tracking-tight text-zinc-100">
            从剧本到成片，
            <br />
            <span className="brand-gradient-text">一站式 AI 影视创作</span>
          </h1>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
              剧本工厂：拆本、大纲、分镜、成片一条龙
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
              影视工厂：会诊、台词、后期逐段打磨
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-500" />
              无限画布：节点式编排你的创作流程
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-zinc-600">
          © {new Date().getFullYear()} {APP_NAME_CN} · {APP_NAME}
        </p>
      </div>

      {/* 表单侧 */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
