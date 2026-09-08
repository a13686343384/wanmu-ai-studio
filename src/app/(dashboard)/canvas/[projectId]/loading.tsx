import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

/** /canvas/[projectId] 路由级加载态：React Flow 编辑器初始化期间的占位。 */
export default function CanvasEditorLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <LoadingSpinner label="正在加载画布…" size="lg" />
    </div>
  )
}
