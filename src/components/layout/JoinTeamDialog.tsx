"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Textarea } from "@/components/ui/textarea"
import { joinTeamSchema, type JoinTeamInput } from "@/lib/validations/workspace"

/**
 * 申请加入团队弹窗。
 * 需要向管理员索要 32 位 Team ID，管理员审批后方可进入。
 */
export function JoinTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<JoinTeamInput>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { teamId: "", message: "" },
  })

  async function onSubmit(values: JoinTeamInput) {
    const res = await fetch("/api/workspaces/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    const payload = await res.json()

    if (!res.ok) {
      toast.error(payload.error ?? "提交申请失败")
      return
    }

    toast.success("申请已提交", { description: "等待管理员审批" })
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>申请加入团队</DialogTitle>
          <DialogDescription>
            管理员审批后你才能进。向对方索要 32 位 Team ID，可选填一句自我介绍。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-id">Team ID</Label>
            <Input
              id="team-id"
              placeholder="32 位字符串"
              autoComplete="off"
              spellCheck={false}
              className="font-mono tracking-wider"
              {...form.register("teamId")}
            />
            {form.formState.errors.teamId && (
              <p className="text-xs text-rose-400">{form.formState.errors.teamId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-message">申请留言（可选）</Label>
            <Textarea
              id="team-message"
              rows={3}
              placeholder="如：Hi 我是新来的设计师"
              {...form.register("message")}
            />
            {form.formState.errors.message && (
              <p className="text-xs text-rose-400">{form.formState.errors.message.message}</p>
            )}
          </div>

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
              提交申请
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
