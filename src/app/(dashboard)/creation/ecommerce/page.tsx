import type { Metadata } from "next"
import { ShoppingBag } from "lucide-react"
import { ComingSoon } from "@/components/shared/ComingSoon"

export const metadata: Metadata = { title: "电商设计室" }

/** 电商设计室（规划中）。 */
export default function EcommercePage() {
  return (
    <ComingSoon
      title="电商设计室"
      subtitle="E-commerce Studio"
      icon={ShoppingBag}
      description="商品图、套图、场景图批量产出。上传一张主图，自动生成多场景、多风格、多尺寸的投放素材。"
      highlights={[
        "商品主图一键换背景与场景",
        "套图批量生成：主图 / 详情图 / 场景图",
        "多尺寸自适应：1:1、3:4、9:16",
        "品牌风格锁定，保证系列一致性",
      ]}
      cta={{ label: "返回工作台", href: "/" }}
    />
  )
}
