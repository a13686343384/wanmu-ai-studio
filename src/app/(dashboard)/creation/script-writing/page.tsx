import type { Metadata } from "next"
import { PenTool } from "lucide-react"
import { ComingSoon } from "@/components/shared/ComingSoon"

export const metadata: Metadata = { title: "剧本创作" }

/** 剧本创作（从点子到整部剧本，规划中）。 */
export default function ScriptWritingPage() {
  return (
    <ComingSoon
      title="剧本创作"
      subtitle="Script Writing"
      icon={PenTool}
      description="从一个点子开始，写出整部剧本。AI 会陪你做人物设定、世界观、分集结构与逐场对白。"
      highlights={[
        "点子扩写：一句话变成一页世界观",
        "人物小传与关系图谱",
        "分集大纲与逐场对白生成",
        "与影视工厂无缝衔接，直接进入建档",
      ]}
      cta={{ label: "先去影视工厂建档", href: "/creation/film-factory/new" }}
    />
  )
}
