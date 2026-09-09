import type { Metadata } from "next"
import { WritingProjects } from "@/components/creation/script-writing/WritingProjects"
export const metadata: Metadata = { title: "剧本创作" }
export default function ScriptWritingPage() {
  return <WritingProjects />
}
