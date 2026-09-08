import type { Metadata } from "next"
import { CanvasProjects } from "@/components/canvas/CanvasProjects"

export const metadata: Metadata = {
  title: "画布",
}

/** 画布模块首页：项目管理（个人 / 团队）。 */
export default function CanvasPage() {
  return <CanvasProjects />
}
