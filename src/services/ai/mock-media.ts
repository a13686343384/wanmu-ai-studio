/**
 * Mock 媒体生成：完全离线产出可展示的占位资源。
 *
 * 图片/封面用 SVG data URL（渐变 + 文案），视频/音频用带封面的占位对象，
 * 保证没有 API Key 时 UI 也能呈现接近真实的观感。
 */

/** 简单确定性哈希，用于把字符串映射到稳定的配色。 */
function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

const PALETTES: [string, string, string][] = [
  ["#0f172a", "#7c2d12", "#f97316"], // 深蓝 → 橙
  ["#0b1220", "#1e3a8a", "#38bdf8"], // 深夜蓝 → 天蓝
  ["#140f0a", "#4c1d95", "#a78bfa"], // 暗紫
  ["#0a0f0d", "#065f46", "#34d399"], // 深绿
  ["#120a0f", "#831843", "#fb7185"], // 玫红
  ["#0c0c10", "#3f3f46", "#e4e4e7"], // 冷灰
]

function paletteFor(seed: string) {
  return PALETTES[hash(seed) % PALETTES.length]!
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** 按画幅比例返回 [宽, 高]。 */
function dimensions(aspectRatio: string, base = 768): [number, number] {
  const [w, h] = aspectRatio.split(":").map(Number)
  if (!w || !h) return [base, Math.round((base * 9) / 16)]

  if (w >= h) return [base, Math.round((base * h) / w)]
  return [Math.round((base * w) / h), base]
}

/**
 * 生成一张 SVG 占位图（data URL）。
 * @param label 画面主文案
 * @param seed 决定配色的稳定种子（一般用 prompt）
 * @param aspectRatio 形如 "16:9"
 */
export function makePoster(label: string, seed: string, aspectRatio = "16:9"): string {
  const [width, height] = dimensions(aspectRatio)
  const [from, via, to] = paletteFor(seed)
  const title = escapeXml(label.slice(0, 28))
  const subtitle = escapeXml(seed.slice(0, 42))
  const circle1 = hash(`${seed}-a`) % 100
  const circle2 = hash(`${seed}-b`) % 100

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="55%" stop-color="${via}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${circle1}%" cy="${circle2}%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="45%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect width="${width}" height="${height}" fill="url(#shade)"/>
  <g opacity="0.16" stroke="#ffffff" stroke-width="1">
    ${Array.from({ length: 7 }, (_, i) => {
      const x = ((i + 1) * width) / 8
      return `<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`
    }).join("")}
  </g>
  <text x="28" y="${height - 58}" fill="#ffffff" font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(width / 26)}" font-weight="600">${title}</text>
  <text x="28" y="${height - 28}" fill="#ffffff" fill-opacity="0.66" font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(width / 46)}">${subtitle}</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** 生成一张纯色/渐变封面（用于音频轨道、视频封面）。 */
export function makeCover(seed: string, aspectRatio = "16:9"): string {
  return makePoster("", seed, aspectRatio)
}

/** 模拟网络与推理耗时。 */
export async function mockDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.random() * Math.max(0, maxMs - minMs)
  await new Promise((resolve) => setTimeout(resolve, ms))
}
