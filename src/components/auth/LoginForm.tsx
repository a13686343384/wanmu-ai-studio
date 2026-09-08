"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

const DEMO = { email: "demo@wanmusheng.com", password: "demo1234" }

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
    })

    if (result?.error) {
      setFormError("邮箱或密码不正确")
      return
    }

    toast.success("登录成功", { description: "欢迎回到万幕生" })
    router.push(callbackUrl)
    router.refresh()
  }

  function fillDemo() {
    form.setValue("email", DEMO.email)
    form.setValue("password", DEMO.password)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">登录万幕生</h2>
        <p className="text-sm text-zinc-500">使用邮箱与密码继续</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-rose-400">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-rose-400">{form.formState.errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <LogIn />
          )}
          登录
        </Button>
      </form>

      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-zinc-950 px-2 text-xs text-zinc-600">或</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={fillDemo} type="button">
          使用演示账号
        </Button>
        <p className="text-center text-xs text-zinc-600">
          demo@wanmusheng.com / demo1234
        </p>
      </div>

      <p className="text-center text-sm text-zinc-500">
        还没有账号？{" "}
        <Link href="/register" className="text-orange-400 hover:text-orange-300">
          立即注册
        </Link>
      </p>
    </div>
  )
}
