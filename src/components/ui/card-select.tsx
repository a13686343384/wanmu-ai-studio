"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { cn } from "@/lib/utils"

export interface CardSelectOption {
  value: string
  label: React.ReactNode
}

/**
 * 统一的紧凑型卡片下拉（触发器 + 分离卡片选项）。
 * 供节点内工具条 / 弹窗表单等紧凑场景使用，样式与系统下拉一致。
 */
export function CardSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className,
  triggerClassName,
  disabled,
  contentClassName,
}: {
  value: string
  onValueChange?: (value: string) => void
  options: (CardSelectOption | string)[]
  placeholder?: string
  ariaLabel?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
  contentClassName?: string
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  )

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("h-8 gap-1 text-xs", triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("min-w-[8rem]", contentClassName)}>
        {normalized.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
