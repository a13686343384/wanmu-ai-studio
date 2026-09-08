import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** 合并 Tailwind 类名，后者覆盖前者的冲突属性。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 千分位数字格式化。 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("zh-CN").format(num)
}

/** 绝对时间格式化：2025-09-08 20:42 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

/** 相对时间格式化：刚刚 / 3分钟前 / 2小时前 / 5天前 */
export function relativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "刚刚"
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 30) return `${diffDay}天前`
  return formatDate(date)
}

/** 时长格式化：90 -> 1:30 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

/** 生成 32 位 Team ID（用于演示加入团队流程）。 */
export function generateTeamId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

/** 截断文本并追加省略号。 */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
