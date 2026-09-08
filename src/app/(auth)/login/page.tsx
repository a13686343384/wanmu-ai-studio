import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "登录" }

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <LoginForm />
    </Suspense>
  )
}
