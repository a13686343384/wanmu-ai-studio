import type { Metadata } from "next"
import { ScriptList } from "@/components/creation/film-factory/ScriptList"

export const metadata: Metadata = {
  title: "影视工厂",
}

/** 影视工厂首页：剧本列表与状态跟踪。 */
export default function FilmFactoryPage() {
  return <ScriptList />
}
