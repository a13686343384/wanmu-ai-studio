import type { Metadata } from "next"
import { FolderOpen } from "lucide-react"
import { ComingSoon } from "@/components/shared/ComingSoon"

export const metadata: Metadata = { title: "剧本工厂" }

/** 剧本工厂（标准管线，规划中）。 */
export default function ScriptFactoryPage() {
  return (
    <ComingSoon
      title="剧本工厂"
      subtitle="Script Factory"
      icon={FolderOpen}
      description="标准管线：拆本、大纲、分镜、成片一条龙。相比影视工厂更轻量，适合快速批量产出短剧。"
      highlights={[
        "一键拆本：自动切分集数与场景",
        "大纲生成：三幕结构 + 每集钩子",
        "分镜直出：跳过人工分镜，直接出图出视频",
        "批量流水线：多剧本并行推进",
      ]}
      cta={{ label: "先使用影视工厂", href: "/creation/film-factory" }}
    />
  )
}
