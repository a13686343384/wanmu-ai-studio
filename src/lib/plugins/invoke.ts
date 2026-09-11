/**
 * 插件模型调用引擎：按模板配置渲染请求体 → 提交 → （async）轮询 → 按点路径提取结果。
 * 模板结构见备忘录第五节（16 个模板，src/lib/plugins/templates.ts）。
 */

export interface InvokeInput {
  prompt: string
  refs?: string[]
  refsB64?: string[]
  count?: number
  ratio?: string
  resolution?: string
  duration?: number
  quality?: string
  system?: string
  maxTokens?: number
  temperature?: number
  upstreamModelId?: string
}

export interface InvokeConfig {
  lifecycle: "sync" | "async"
  baseUrl: string
  apiKey?: string | null
  auth?: {
    header?: string
    scheme?: string
    extra_headers?: Record<string, string>
  }
  constraints?: Record<string, unknown>
  submit: {
    method?: string
    path: string
    timeout_sec?: number
    body: Record<string, unknown>
    encoding?: string
    file_field?: string
  }
  edits?: {
    method?: string
    path: string
    timeout_sec?: number
    body: Record<string, unknown>
    encoding?: string
    file_field?: string
  } | null
  refRegister?: {
    register: {
      method?: string
      path: string
      file_field?: string
      timeout_sec?: number
    }
  } | null
  poll?: {
    method?: string
    path: string
    interval_sec?: number
    deadline_sec?: number
    timeout_sec?: number
    not_found_grace?: number
  } | null
  firstLast?: { body?: Record<string, unknown> } | null
  extract: Record<string, unknown>
  /** JS 函数体：(body, input) => body，在模板渲染后做二次加工 */
  transformBody?: string | null
}

/** 点路径取值：choices.0.message.content */
export function extractPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current == null) return undefined
    if (Array.isArray(current)) return current[Number(segment)]
    if (typeof current === "object")
      return (current as Record<string, unknown>)[segment]
    return undefined
  }, obj)
}

/** 渲染模板串：{{key}} / {{key | int}} / {{key | default:"x"}} */
export function renderValue(
  value: unknown,
  vars: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    const intOnly = value.match(/^\{\{\s*(\w+)\s*\|\s*int\s*\}\}$/)
    if (intOnly) return Number.parseInt(vars[intOnly[1]] ?? "0", 10) || 0
    let out = value
    // {{key | default:"x"}}
    out = out.replace(
      /\{\{\s*(\w+)\s*\|\s*default:\s*"([^"]*)"\s*\}\}/g,
      (_, key, fallback) => vars[key] ?? fallback,
    )
    // {{key | int}}
    out = out.replace(
      /\{\{\s*(\w+)\s*\|\s*int\s*\}\}/g,
      (_, key) => vars[key] ?? "0",
    )
    // {{key}}
    out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "")
    return out
  }
  if (Array.isArray(value)) return value.map((item) => renderValue(item, vars))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = renderValue(item, vars)
    }
    return out
  }
  return value
}

function pickString(data: unknown, paths: unknown): string | undefined {
  if (!Array.isArray(paths)) return undefined
  for (const path of paths) {
    const value = extractPath(data, String(path))
    if (value != null) return String(value)
  }
  return undefined
}

export async function invokeCustomModel(
  config: InvokeConfig,
  input: InvokeInput,
): Promise<
  { ok: true; url?: string; text?: string } | { ok: false; error: string }
> {
  const constraints = (config.constraints ?? {}) as Record<string, unknown>
  const vars: Record<string, string> = {
    model_id:
      input.upstreamModelId ?? String(constraints.model_id ?? "default"),
    prompt: input.prompt,
    ratio: input.ratio ?? "16:9",
    resolution: input.resolution ?? "720p",
    duration: String(input.duration ?? 5),
    count: String(input.count ?? 1),
    size: `${input.ratio ?? "16:9"}-${input.resolution ?? "1K"}`,
    image_quality: input.quality ?? "high",
    refs: (input.refs ?? []).join(","),
    refs_b64: (input.refsB64 ?? []).join(","),
    system: input.system ?? "",
    max_tokens: String(input.maxTokens ?? 4096),
    temperature: String(input.temperature ?? 0.8),
  }

  const hasRefs =
    (input.refs?.length ?? 0) > 0 || (input.refsB64?.length ?? 0) > 0
  const edits = config.edits
  const useEdits = Boolean(edits) && hasRefs

  const action = useEdits ? (edits as NonNullable<typeof edits>) : config.submit
  const method = (action.method ?? "POST").toUpperCase()
  const url = `${config.baseUrl.replace(/\/$/, "")}${action.path}`
  let body: unknown = renderValue(action.body, vars)

  // transformBody 钩子：模板渲染后的二次加工
  if (config.transformBody) {
    try {
      const fn = new Function("body", "input", config.transformBody) as (
        body: unknown,
        input: InvokeInput,
      ) => unknown
      body = fn(body, input)
    } catch (err) {
      console.warn("[invoke] transformBody 执行失败，使用原始 body:", err)
    }
  }

  const headers: Record<string, string> = { "content-type": "application/json" }
  const auth = config.auth ?? {}
  if (auth.header && auth.header !== "x-goog-api-key") {
    const scheme = auth.scheme ?? "Bearer"
    headers[auth.header] = `${scheme} ${config.apiKey ?? ""}`.trim()
  }
  if (auth.header === "x-goog-api-key")
    headers[auth.header] = config.apiKey ?? ""
  for (const [key, value] of Object.entries(auth.extra_headers ?? {})) {
    headers[key] = value
  }

  let responseData: unknown
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout((action.timeout_sec ?? 300) * 1000),
    })
    responseData = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        pickString(responseData, ["error.message", "error"]) ??
        `上游返回 ${res.status}`
      return { ok: false, error: message }
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "上游请求失败",
    }
  }

  const extract = config.extract ?? {}
  const statusMap = (extract.status_map ?? {}) as {
    done?: string[]
    fail?: string[]
  }

  // sync：直接提取
  if (config.lifecycle !== "async" || !config.poll) {
    const url = pickString(responseData, (extract.url as string[]) ?? [])
    const text = pickString(responseData, (extract.text as string[]) ?? [])
    const b64 = pickString(responseData, (extract.b64 as string[]) ?? [])
    const error = pickString(responseData, (extract.error as string[]) ?? [])
    if (error && !url && !text && !b64) return { ok: false, error }
    if (b64) return { ok: true, url: `data:image/png;base64,${b64}` }
    if (url) return { ok: true, url }
    if (text) return { ok: true, text }
    return { ok: false, error: "上游响应中未找到结果" }
  }

  // async：提取任务 id 后轮询
  const taskId =
    pickString(responseData, (extract.id as string[]) ?? []) ??
    extractPath(responseData, "data.id")?.toString()
  if (!taskId) return { ok: false, error: "上游未返回任务 id" }

  const poll = config.poll
  const interval = (poll.interval_sec ?? 5) * 1000
  const deadline = Date.now() + (poll.deadline_sec ?? 3600) * 1000
  const pollUrl = `${config.baseUrl.replace(/\/$/, "")}${poll.path.replace("{{id}}", taskId)}`
  const graceUntil = Date.now() + (poll.not_found_grace ?? 3) * 1000

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval))
    let data: unknown
    try {
      const res = await fetch(pollUrl, {
        headers,
        signal: AbortSignal.timeout((poll.timeout_sec ?? 30) * 1000),
      })
      data = await res.json().catch(() => ({}))
      if (!res.ok && Date.now() > graceUntil) {
        return { ok: false, error: `轮询失败 ${res.status}` }
      }
    } catch {
      continue
    }

    const status = (
      pickString(data, [String(extract.status ?? "status")]) ?? ""
    ).toLowerCase()
    const doneKeys = statusMap.done ?? ["success", "succeeded"]
    const failKeys = statusMap.fail ?? ["failed", "error"]
    if (doneKeys.includes(status)) {
      const url = pickString(data, (extract.url as string[]) ?? [])
      const b64 = pickString(data, (extract.b64 as string[]) ?? [])
      if (b64) return { ok: true, url: `data:image/png;base64,${b64}` }
      if (url) return { ok: true, url }
      return { ok: false, error: "任务完成但未返回结果地址" }
    }
    if (failKeys.includes(status)) {
      return {
        ok: false,
        error:
          pickString(data, (extract.error as string[]) ?? []) ?? "上游任务失败",
      }
    }
  }
  return { ok: false, error: "上游任务超时" }
}
