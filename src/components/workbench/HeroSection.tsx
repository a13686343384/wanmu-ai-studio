import { GenerationPanel } from "@/components/workbench/GenerationPanel"

/**
 * 工作台首屏 Hero 区。
 * 背景为程序化生成的电影感光晕（无外部位图依赖），
 * 中央为欢迎语与生成面板。
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-900">
      {/* 背景层：深空渐变 + 双色光晕 + 网格 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />
        <div className="absolute -left-40 -top-56 h-[560px] w-[560px] rounded-full bg-orange-600/20 blur-[140px]" />
        <div className="absolute -right-32 top-0 h-[440px] w-[440px] rounded-full bg-sky-600/10 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[520px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-16 sm:pt-20 lg:px-6">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] text-zinc-400 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
            全能参考 · 图 / 文 / 音 / 视频自由组合
          </span>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            你好，今天想生成点什么？
          </h1>
        </div>

        <GenerationPanel />
      </div>
    </section>
  )
}
