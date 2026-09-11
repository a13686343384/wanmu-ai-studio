import type { Metadata } from "next"
import { PluginSettings } from "@/components/plugins/PluginSettings"

export const metadata: Metadata = {
  title: "配置",
}

/** 配置中心：AI 服务 · 模型接入 · 凭据管理 · 风格模板。 */
export default function AiSettingsPage() {
  return <PluginSettings />
}
