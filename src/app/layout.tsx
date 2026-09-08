import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { APP_NAME, APP_NAME_CN, APP_TAGLINE } from "@/lib/constants"
import "@/styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME_CN} · ${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME_CN}`,
  },
  description:
    "万幕生（Manvo TV）是一站式 AI 影视创作平台：从剧本建档、会诊、大纲，到人物场景资产、拆分镜、出视频与后期，全流程 AI 驱动。",
  keywords: ["AI 影视", "AI 短剧", "剧本工厂", "影视工厂", "分镜", "万幕生", "Manvo TV"],
}

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
