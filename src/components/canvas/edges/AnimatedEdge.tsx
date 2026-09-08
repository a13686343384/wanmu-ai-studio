"use client"

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react"

/**
 * 动画连线：在贝塞尔曲线上叠加流动的虚线，
 * 用于表达「数据正在向下游流动」。
 */
export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: "rgba(249,115,22,0.45)", strokeWidth: 1.5, ...style }}
      />
      <circle r="2.5" fill="#f97316">
        <animateMotion dur="2.4s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  )
}
