"use client"

import { ExternalLink, Film, Layers, Monitor, Wand2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionCard, OptionPills } from "@/components/creation/film-factory/intake/OptionCard"
import { ModelPicker } from "@/components/creation/film-factory/intake/ModelPicker"
import {
  ASPECT_RATIOS,
  EXECUTION_MODES,
  SCRIPT_PROCESSING_MODES,
  SERIES_TYPES,
  TEXT_MODELS,
  WORK_TYPES,
  type AspectRatio,
  type ExecutionMode,
  type ScriptProcessingMode,
  type SeriesType,
  type WorkType,
} from "@/lib/constants"

export interface IntakeConfig {
  workType: WorkType
  seriesType: SeriesType
  targetAspect: AspectRatio
  textModel: string
  processingMode: ScriptProcessingMode
  executionMode: ExecutionMode
  consultModel: string
  dialogueModel: string
}

/**
 * INTAKE 右栏：参数配置。
 * 作品类型 / 剧集类型 / 目标画幅 / 推理模型 / 加工方式 / 模型细分 / 执行方式。
 */
export function ConfigPanel({
  config,
  onChange,
}: {
  config: IntakeConfig
  onChange: (patch: Partial<IntakeConfig>) => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-0.5 rounded bg-orange-500" />
        <h2 className="text-sm font-medium text-zinc-200">参数配置</h2>
      </div>

      {/* 作品类型 */}
      <div className="space-y-2">
        <Label>作品类型</Label>
        <OptionPills
          options={WORK_TYPES.map((w) => ({ value: w.value, label: w.label }))}
          value={config.workType}
          onChange={(value) => onChange({ workType: value })}
        />
        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-orange-400"
          onClick={() => {}}
        >
          <ExternalLink className="h-3 w-3" />
          自定义平台节奏档案（可选 - 不填按作品类型派生）
        </button>
      </div>

      <Separator />

      {/* 剧集类型 */}
      <div className="space-y-2">
        <Label>剧集类型（决定后续能不能持续集）</Label>
        <div className="grid gap-2">
          {SERIES_TYPES.map((type) => (
            <OptionCard
              key={type.value}
              label={type.label}
              description={type.description}
              selected={config.seriesType === type.value}
              onSelect={() => onChange({ seriesType: type.value })}
              icon={Layers}
              compact
            />
          ))}
        </div>
      </div>

      {/* 目标画幅 */}
      <div className="space-y-2">
        <Label>目标画幅（全剧统一）</Label>
        <OptionPills
          options={ASPECT_RATIOS.map((r) => ({ value: r.value, label: r.label }))}
          value={config.targetAspect}
          onChange={(value) => onChange({ targetAspect: value })}
        />
      </div>

      <Separator />

      {/* 推理模型 */}
      <ModelPicker
        label="推理用 AI 模型 *（后续生成大纲也用同款）"
        value={config.textModel}
        onChange={(value) =>
          onChange({ textModel: value, consultModel: value, dialogueModel: value })
        }
        hint="5/次 · 整片按实际生成步数（立项 / 大纲 / 每集）累计扣费。生成老失败 / JSON 报错？测一测你的模型支不支持「结构化输出」。"
      />

      <Separator />

      {/* 剧本加工方式 */}
      <div className="space-y-2">
        <Label>剧本加工方式</Label>
        <div className="grid gap-2">
          {SCRIPT_PROCESSING_MODES.map((mode) => (
            <OptionCard
              key={mode.value}
              label={mode.label}
              description={mode.description}
              recommended={mode.recommended}
              selected={config.processingMode === mode.value}
              onSelect={() => onChange({ processingMode: mode.value })}
              icon={Wand2}
            />
          ))}
        </div>
      </div>

      {/* 模型细分 */}
      {config.processingMode === "consult_optimize" && (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            会诊与台词可用不同模型 —— 会诊重逻辑结构（可用更强的推理模型），台词重口语感，不改则都跟随上面的主模型。
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">会诊 / 改写模型</Label>
              <ModelPicker
                compact
                value={config.consultModel}
                onChange={(value) => onChange({ consultModel: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400">台词优化模型</Label>
              <ModelPicker
                compact
                value={config.dialogueModel}
                onChange={(value) => onChange({ dialogueModel: value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 执行方式 */}
      <div className="space-y-2">
        <Label>会诊 / 台词怎么执行</Label>
        <div className="grid gap-2">
          {EXECUTION_MODES.map((mode) => (
            <OptionCard
              key={mode.value}
              label={mode.label}
              description={mode.description}
              recommended={mode.recommended}
              selected={config.executionMode === mode.value}
              onSelect={() => onChange({ executionMode: mode.value })}
              icon={Film}
            />
          ))}
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
        <Monitor className="mt-0.5 h-3 w-3 shrink-0" />
        当前主模型：{TEXT_MODELS.find((m) => m.id === config.textModel)?.name ?? config.textModel}
      </p>
    </div>
  )
}
