"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CardSelect } from "@/components/ui/card-select"
import { ASPECT_RATIOS, IMAGE_MODELS, TEXT_MODELS } from "@/lib/constants"
export interface AssetSetup {
  textModel: string
  imageModel: string
  aspectRatio: string
  resolution: string
}
export function AssetSetupDialog({
  open,
  onOpenChange,
  aspectRatio,
  onStart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  aspectRatio: string
  onStart: (config: AssetSetup) => void
}) {
  const [textModel, setTextModel] = useState(TEXT_MODELS[0]!.id)
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0]!.id)
  const [aspect, setAspect] = useState(aspectRatio)
  const [resolution, setResolution] = useState("1K")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>生成人物 / 场景资产</DialogTitle>
          <DialogDescription>
            提取缺少的角色、场景和道具，为尚未出图的资产逐项生成图片。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-400">文本模型</Label>
          <CardSelect
            ariaLabel="资产文本模型"
            value={textModel}
            onValueChange={setTextModel}
            options={TEXT_MODELS.map((item) => ({ value: item.id, label: item.name }))}
            triggerClassName="h-10 w-full text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-400">生图模型</Label>
          <CardSelect
            ariaLabel="资产生图模型"
            value={imageModel}
            onValueChange={setImageModel}
            options={IMAGE_MODELS.map((item) => ({ value: item.id, label: item.name }))}
            triggerClassName="h-10 w-full text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-400">画幅</Label>
            <CardSelect
              value={aspect}
              onValueChange={setAspect}
              options={ASPECT_RATIOS.map((item) => ({ value: item.value, label: item.value }))}
              triggerClassName="h-10 w-full text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-400">分辨率</Label>
            <CardSelect
              value={resolution}
              onValueChange={setResolution}
              options={[
                { value: "1K", label: "1K" },
                { value: "2K", label: "2K" },
              ]}
              triggerClassName="h-10 w-full text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="inverse"
            onClick={() => {
              onStart({
                textModel,
                imageModel,
                aspectRatio: aspect,
                resolution,
              })
            }}
          >
            生成人物 / 场景
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
