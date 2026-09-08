import type { Metadata } from "next"
import { MessageSquare } from "lucide-react"
import { ComingSoon } from "@/components/shared/ComingSoon"

export const metadata: Metadata = { title: "联系我们" }

/** 联系与支持（规划中）。 */
export default function ContactPage() {
  return (
    <ComingSoon
      title="联系我们"
      subtitle="Contact"
      icon={MessageSquare}
      description="产品咨询、企业定制、API 合作与技术支持的统一入口。当前版本请通过工作台右上角「帮助」查看使用文档。"
      highlights={[
        "企业定制：私有化部署与专属模型微调",
        "API 合作：按量计费的生成能力开放",
        "技术支持：工作日 10:00 - 19:00 响应",
      ]}
      cta={{ label: "返回工作台", href: "/" }}
    />
  )
}
