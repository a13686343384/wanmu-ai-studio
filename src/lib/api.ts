/**
 * 统一 API 响应格式与错误类型。
 * 所有 route handler 都应通过 jsonOk / jsonError 返回，保证前端处理一致。
 */
import { NextResponse } from "next/server"
import { ZodError } from "zod"

export interface ApiSuccess<T> {
  data: T
  message?: string
}

export interface ApiFailure {
  error: string
  details?: unknown
}

/** 业务错误：可携带 HTTP 状态码。 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function jsonOk<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ data, ...(message ? { message } : {}) }, { status })
}

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiFailure>({ error, ...(details ? { details } : {}) }, { status })
}

/**
 * 包裹 route handler，集中处理异常：
 * - AppError → 使用其状态码与消息
 * - ZodError → 400 + 字段级错误
 * - 其他 → 500
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof AppError) {
        return jsonError(error.message, error.statusCode, error.details)
      }
      if (error instanceof ZodError) {
        return jsonError("参数校验失败", 400, error.flatten().fieldErrors)
      }
      console.error("[api] 未处理异常:", error)
      const message = error instanceof Error ? error.message : "服务器内部错误"
      return jsonError(message, 500)
    }
  }
}
