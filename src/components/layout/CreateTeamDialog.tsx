"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWorkspaceSchema, type CreateWorkspaceInput } from "@/lib/validations/workspace"
import { MAX_TEAMS_PER_USER } from "@/lib/constants"

/**
 * 创建团队弹窗。
 * 团队内共享画布、资产与 Tapies 额度，每人最多创建 5 个团队。
 */
export function CreateTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const form = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "", description: "" },
  })

  async function onSubmit(values: CreateWorkspaceInput) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    const payload = await res.json()

    if (!res.ok) {
      toast.error(payload.error ?? "创建团队失败")
      return
    }

    toast.success("团队创建成功", { description: `已创建「${payload.data.name}」` })
    form.reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建团队</DialogTitle>
          <DialogDescription>
            团队内所有成员共享画布、资产和 Tapies 额度，最多可创建 {MAX_TEAMS_PER_USER} 个团队。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="sr-only">
              团队名称
            </Label>
            <Input id="team-name" placeholder="请输入团队名称" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <input type="hidden" {...form.register("description")} />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" variant="inverse" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
