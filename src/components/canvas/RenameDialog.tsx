"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
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

const schema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(60, "名称最多 60 字"),
})

type FormValues = z.infer<typeof schema>

/** 通用重命名弹窗（项目 / 文件夹）。 */
export function RenameDialog({
  open,
  onOpenChange,
  currentName,
  title = "重命名",
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  title?: string
  onSubmit: (name: string) => Promise<void>
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: currentName },
  })

  useEffect(() => {
    if (open) form.reset({ name: currentName })
  }, [open, currentName, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>修改后立即生效。</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values.name)
            onOpenChange(false)
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="rename-input">名称</Label>
            <Input id="rename-input" autoFocus {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-rose-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" variant="inverse" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
