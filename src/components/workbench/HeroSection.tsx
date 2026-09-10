import { GenerationPanel } from "@/components/workbench/GenerationPanel"

/**
 * 工作台首屏 Hero 区。
 * 背景为程序化 SVG 电影感深空场景（星球地平线 / 塔楼剪影 / 星野），
 * 中央为欢迎语与生成面板。
 */

/** 星野：确定性伪随机分布，避免每次渲染跳动。 */
function Stars() {
  const stars: { x: number; y: number; r: number; o: number }[] = []
  let seed = 42
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.round(random() * 1600),
      y: Math.round(random() * 620),
      r: 0.6 + random() * 1.2,
      o: 0.25 + random() * 0.65,
    })
  }

  return (
    <g>
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="white"
          opacity={star.o}
        />
      ))}
    </g>
  )
}

function HeroBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1322" />
          <stop offset="0.55" stopColor="#070b14" />
          <stop offset="1" stopColor="#04060b" />
        </linearGradient>
        <radialGradient id="planet" cx="0.5" cy="0.1" r="1">
          <stop offset="0" stopColor="#1b2a44" />
          <stop offset="0.5" stopColor="#0d1526" />
          <stop offset="1" stopColor="#050810" />
        </radialGradient>
        <radialGradient id="amberGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="coolGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.22" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#111827" />
          <stop offset="1" stopColor="#05070c" />
        </linearGradient>
        <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04060b" stopOpacity="0" />
          <stop offset="1" stopColor="#04060b" />
        </linearGradient>
      </defs>

      {/* 深空 */}
      <rect width="1600" height="900" fill="url(#sky)" />
      <Stars />

      {/* 氛围光 */}
      <ellipse cx="1180" cy="180" rx="560" ry="360" fill="url(#coolGlow)" />
      <ellipse cx="240" cy="640" rx="620" ry="380" fill="url(#amberGlow)" opacity="0.55" />

      {/* 星球地平线（左下） */}
      <g>
        <circle cx="300" cy="1150" r="560" fill="url(#planet)" />
        <circle
          cx="300"
          cy="1150"
          r="560"
          fill="none"
          stroke="#fdba74"
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
        <circle
          cx="300"
          cy="1150"
          r="585"
          fill="none"
          stroke="#fb923c"
          strokeOpacity="0.18"
          strokeWidth="14"
          style={{ filter: "blur(10px)" }}
        />
        {/* 地表细节：微光网格带 */}
        <path
          d="M -80 760 Q 300 640 700 745"
          fill="none"
          stroke="#93c5fd"
          strokeOpacity="0.14"
          strokeWidth="1.5"
        />
        <path
          d="M -80 810 Q 300 690 720 800"
          fill="none"
          stroke="#93c5fd"
          strokeOpacity="0.1"
          strokeWidth="1.5"
        />
      </g>

      {/* 右侧塔楼群剪影 + 窗灯 */}
      <g>
        <rect x="1080" y="150" width="120" height="750" fill="url(#tower)" />
        <rect x="1220" y="60" width="150" height="840" fill="url(#tower)" />
        <rect x="1390" y="220" width="105" height="680" fill="url(#tower)" />
        <rect x="1500" y="120" width="130" height="780" fill="url(#tower)" />
        {/* 塔顶航空灯 */}
        <circle cx="1295" cy="58" r="3" fill="#f87171" opacity="0.9" />
        <circle cx="1565" cy="118" r="3" fill="#f87171" opacity="0.8" />
        {/* 窗灯 */}
        {Array.from({ length: 26 }).map((_, index) => {
          let seed = index * 97 + 13
          const random = () => {
            seed = (seed * 16807) % 2147483647
            return seed / 2147483647
          }
          const x = [1090, 1108, 1150, 1234, 1268, 1310, 1350, 1400, 1436, 1516, 1554, 1596][
            index % 12
          ]!
          const y = 180 + Math.round(random() * 640)
          return (
            <rect
              key={index}
              x={x}
              y={y}
              width="7"
              height="10"
              fill="#fcd34d"
              opacity={0.14 + random() * 0.3}
              rx="1"
            />
          )
        })}
      </g>

      {/* 左侧桁架结构剪影 */}
      <g stroke="#0d1320" strokeWidth="14" opacity="0.9">
        <line x1="60" y1="900" x2="200" y2="360" />
        <line x1="230" y1="900" x2="200" y2="360" />
        <line x1="90" y1="740" x2="222" y2="620" />
        <line x1="120" y1="600" x2="210" y2="480" />
        <line x1="40" y1="560" x2="200" y2="360" stroke="#0a0f1a" />
      </g>
      <circle cx="200" cy="352" r="5" fill="#f87171" opacity="0.85" />

      {/* 底部渐隐，融入页面背景 */}
      <rect y="620" width="1600" height="280" fill="url(#fadeBottom)" />
      {/* 轻微暗角 */}
      <rect width="1600" height="900" fill="black" opacity="0.18" />
    </svg>
  )
}

export function HeroSection() {
  return (
    <section className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+10rem)]">
        <HeroBackdrop />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-14 sm:pt-20 lg:px-6">
        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          你好，今天想生成点什么？
        </h1>

        <GenerationPanel />
      </div>
    </section>
  )
}
