import type { Metadata } from "next"
import { PluginSettings } from "@/components/plugins/PluginSettings"

export const metadata: Metadata = {
  title: "插件",
}

/** 插件：自定义模型接入与凭据管理。 */
export default function PluginsPage() {
  return <PluginSettings />
}
