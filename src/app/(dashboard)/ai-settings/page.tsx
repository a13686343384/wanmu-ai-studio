import type { Metadata } from "next"
import { PluginSettings } from "@/components/plugins/PluginSettings"

export const metadata: Metadata = {
  title: "AI 设置",
}

/** AI 设置：模型接入配置与凭据管理。 */
export default function AiSettingsPage() {
  return <PluginSettings />
}
