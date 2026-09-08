import type { Metadata } from "next"
import { IntakeForm } from "@/components/creation/film-factory/intake/IntakeForm"

export const metadata: Metadata = {
  title: "新建剧本 · 立项台",
}

/** 新建剧本（INTAKE）页面。 */
export default function NewScriptPage() {
  return <IntakeForm />
}
