"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createProjectSchema, type CreateProjectInput } from "@/lib/validations/project"
import type { WorkspaceSummary } from "@/components/layout/WorkspaceSwitcher"

/** 新建画布项目弹窗。 */
export function NewProjectDialog({
  open,
  onOpenChange,
  workspaces,
  defaultWorkspaceId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: WorkspaceSummary[]
  defaultWorkspaceId?: string
  onCreated: (projectId: string) => void
}) {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "", workspaceId: defaultWorkspaceId ?? "" },
  })

  async function submit(values: CreateProjectInput) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, workspaceId: values.workspaceId || undefined }),
    })
    const payload = await res.json()

    if (!res.ok) {
      form.setError("root", { message: payload.error ?? "创建失败" })
      return
    }

    form.reset()
    onOpenChange(false)
    onCreated(payload.data.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>创建一个空白画布，稍后可拖入节点编排创作流程。</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">项目名称</Label>
            <Input id="project-name" placeholder="例如：雪崩 · 预告片" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc">项目描述（可选）</Label>
            <Input id="project-desc" placeholder="一句话说明这个项目" {...form.register("description")} />
          </div>

          {workspaces.length > 0 && (
            <div className="space-y-2">
              <Label>所属工作区</Label>
              <Select
                value={form.watch("workspaceId") || workspaces[0]?.id}
                onValueChange={(value) => form.setValue("workspaceId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择工作区" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                      {w.isPersonal ? "（个人）" : "（团队）"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.formState.errors.root && (
            <p className="text-xs text-rose-400">{form.formState.errors.root.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" variant="inverse" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
              创建项目
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
