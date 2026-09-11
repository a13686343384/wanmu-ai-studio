"use client"
import { useEffect, useState } from "react"
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
import { normalizeAssetConfig } from "@/lib/assets/config"
import { useAiModels } from "@/hooks/useAiModels"
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
  initialConfig,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  aspectRatio: string
  initialConfig?: unknown
  onStart: (config: AssetSetup) => void
}) {
  const { models: textModels } = useAiModels("text")
  const { models: imageModels } = useAiModels("image")
  const [textModel, setTextModel] = useState("")
  const [imageModel, setImageModel] = useState("")
  useEffect(() => {
    if (textModels.length && !textModel) setTextModel(textModels[0]!.id)
  }, [textModels, textModel])
  useEffect(() => {
    if (imageModels.length && !imageModel) setImageModel(imageModels[0]!.id)
  }, [imageModels, imageModel])
  void aspectRatio
  const aspect = "16:9"
  useEffect(() => {
    if (open && initialConfig) {
      const config = normalizeAssetConfig(initialConfig)
      setTextModel(config.textModelId)
      setImageModel(config.imageModelId)
      setResolution(config.resolution)
    }
  }, [open, initialConfig])
  const [resolution, setResolution] = useState("1K")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>提取人物 / 场景资产</DialogTitle>
          <DialogDescription>
            第一步：用大模型从剧本中提取缺少的角色、场景、道具描述词（不生成图片）。
            生图模型用于描述适配，设定卡画幅和分辨率将保存供第二步出图使用；提取完成后，点右栏旋转图标主动出图。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-400">文本模型</Label>
          <CardSelect
            ariaLabel="资产文本模型"
            value={textModel}
            onValueChange={setTextModel}
            options={
              textModels.length > 0
                ? textModels.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))
                : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
            }
            triggerClassName="h-10 w-full text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-zinc-400">生图模型</Label>
          <CardSelect
            ariaLabel="资产生图模型"
            value={imageModel}
            onValueChange={setImageModel}
            options={
              imageModels.length > 0
                ? imageModels.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))
                : [{ value: "", label: "暂无可用模型，请到「AI 设置」配置" }]
            }
            triggerClassName="h-10 w-full text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-400">资产设定卡画幅</Label>
            <CardSelect
              value={aspect}
              onValueChange={() => {}}
              options={[{ value: "16:9", label: "16:9（独立于影片画幅）" }]}
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
                { value: "4K", label: "4K" },
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
            disabled={!textModel || !imageModel}
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
            提取资产描述词
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
