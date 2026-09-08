import type { Metadata } from "next"
import { Puzzle } from "lucide-react"
import { ComingSoon } from "@/components/shared/ComingSoon"

export const metadata: Metadata = { title: "插件" }

/** 插件市场（规划中）。 */
export default function PluginsPage() {
  return (
    <ComingSoon
      title="插件市场"
      subtitle="Plugins"
      icon={Puzzle}
      description="把万幕生的生成能力接到你自己的工作流里：第三方模型接入、自动化脚本、批量任务编排与团队级配额管理。"
      highlights={[
        "第三方 AI 供应商接入（文本 / 图像 / 视频 / 音频）",
        "Webhook 与 OpenAPI，供外部系统触发生成任务",
        "批量任务编排：一次提交数百个镜头",
        "团队级配额与权限策略",
      ]}
      cta={{ label: "先去影视工厂体验完整流程", href: "/creation/film-factory" }}
    />
  )
}
