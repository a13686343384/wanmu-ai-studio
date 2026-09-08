import {
  Film,
  FolderOpen,
  Home,
  LayoutGrid,
  MessageSquare,
  PenTool,
  Puzzle,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

/** 常量中以字符串形式声明的图标名 → Lucide 组件映射。 */
export const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  LayoutGrid,
  Sparkles,
  Puzzle,
  MessageSquare,
  FolderOpen,
  Film,
  PenTool,
  ShoppingBag,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Sparkles
}
