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
  const cls =
    "mt-2 h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>生成人物 / 场景资产</DialogTitle>
          <DialogDescription>
            提取缺少的角色、场景和道具，为尚未出图的资产逐项生成图片。
          </DialogDescription>
        </DialogHeader>
        <label className="text-sm text-zinc-400">
          文本模型
          <select
            aria-label="资产文本模型"
            className={cls}
            value={textModel}
            onChange={(e) => setTextModel(e.target.value)}
          >
            {TEXT_MODELS.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-400">
          生图模型
          <select
            aria-label="资产生图模型"
            className={cls}
            value={imageModel}
            onChange={(e) => setImageModel(e.target.value)}
          >
            {IMAGE_MODELS.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-zinc-400">
            画幅
            <select
              className={cls}
              value={aspect}
              onChange={(e) => setAspect(e.target.value)}
            >
              {ASPECT_RATIOS.map((item) => (
                <option key={item.value}>{item.value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            分辨率
            <select
              className={cls}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option>1K</option>
              <option>2K</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="inverse"
            onClick={() => {
              onOpenChange(false)
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
