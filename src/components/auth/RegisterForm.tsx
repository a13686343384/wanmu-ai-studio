"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"

export function RegisterForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: RegisterInput) {
    setFormError(null)

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      setFormError(payload.error ?? "注册失败")
      return
    }

    // 注册成功后自动登录
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    })

    if (result?.error) {
      toast.success("注册成功", { description: "请使用新账号登录" })
      router.push("/login")
      return
    }

    toast.success("注册成功", { description: "已为你创建个人工作区" })
    router.push("/")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">创建万幕生账号</h2>
        <p className="text-sm text-zinc-500">注册即获赠 1000 积分</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">昵称</Label>
          <Input id="name" placeholder="你希望被如何称呼" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
          )}
        </div>

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
            autoComplete="new-password"
            placeholder="至少 8 位，含字母和数字"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-rose-400">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="再次输入密码"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-rose-400">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
          注册
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        已有账号？{" "}
        <Link href="/login" className="text-orange-400 hover:text-orange-300">
          去登录
        </Link>
      </p>
    </div>
  )
}
