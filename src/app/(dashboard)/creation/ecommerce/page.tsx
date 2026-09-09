import type { Metadata } from "next"
import { EcommerceStudio } from "@/components/ecommerce/EcommerceStudio"

export const metadata: Metadata = {
  title: "电商设计室",
}

/** 电商设计室：商品套图 / A+ 详情页。 */
export default function EcommercePage() {
  return <EcommerceStudio />
}
