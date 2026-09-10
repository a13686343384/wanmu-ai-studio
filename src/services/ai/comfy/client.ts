/**
 * 本地 ComfyUI 客户端（统一配置入口里的「本地辅助通道」）。
 *
 * - 工作流模板为 ComfyUI /prompt API 格式（节点字典），存放在 workflows/ 下
 * - 参考图先经 /upload/image 上传，再以文件名注入 LoadImage 节点
 * - 提交后轮询 /history/{promptId}，产物经 /view 取回字节，落到 MediaFile
 *   供浏览器以 /api/media/{id} 访问
 */

import { prisma } from "@/lib/prisma"

export interface ComfyRefImage {
  name: string
  bytes: Buffer
  mimeType: string
}

export interface ComfyRunOptions {
  baseUrl: string
  /** API 格式工作流（节点字典），未传则用内置 MiniMaxH3 图生视频模板 */
  graph: Record<string, unknown>
  /** 参考图（按顺序注入 refImageNodes 指定的 LoadImage 节点） */
  refs?: ComfyRefImage[]
  /** LoadImage 节点 id 列表（按顺序接收参考图） */
  refImageNodes?: string[]
  timeoutMs?: number
}

export interface ComfyOutput {
  filename: string
  subfolder: string
  type: string
  bytes: Buffer
  mimeType: string
}

const JSON_TIMEOUT = 8000

async function comfyJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(JSON_TIMEOUT) })
  if (!res.ok) {
    throw new Error(`ComfyUI ${res.status}：${(await res.text()).slice(0, 160)}`)
  }
  return res.json()
}

/** 服务是否可达（/system_info）。 */
export async function comfyPing(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/system_info`, {
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}

/** 上传参考图，返回注入 LoadImage 的文件名。 */
async function uploadImage(
  baseUrl: string,
  ref: ComfyRefImage,
): Promise<string> {
  const form = new FormData()
  const blob = new Blob([ref.bytes as unknown as BlobPart], {
    type: ref.mimeType || "image/png",
  })
  form.set("image", blob, ref.name)
  form.set("overwrite", "true")
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/upload/image`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`ComfyUI 上传参考图失败：${res.status}`)
  const payload = (await res.json()) as { name: string }
  return payload.name
}

/** 深拷贝工作流并按 { nodeId: { input: value } } 覆盖参数。 */
export function buildGraph(
  template: Record<string, unknown>,
  overrides: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const graph = JSON.parse(JSON.stringify(template)) as Record<
    string,
    { inputs: Record<string, unknown> }
  >
  for (const [nodeId, inputs] of Object.entries(overrides)) {
    if (!graph[nodeId]) throw new Error(`ComfyUI 模板缺少节点 ${nodeId}`)
    graph[nodeId].inputs = { ...graph[nodeId].inputs, ...inputs }
  }
  return graph
}

/** 提交并等待完成，取回全部输出产物。 */
export async function comfyRun(
  options: ComfyRunOptions,
): Promise<ComfyOutput[]> {
  const base = options.baseUrl.replace(/\/$/, "")
  if (!(await comfyPing(base))) {
    throw new Error(
      `ComfyUI（${base}）不可达：请确认 Win11 主机已启动 ComfyUI 且 8118 端口对局域网开放`,
    )
  }

  // 参考图注入
  const graph = JSON.parse(JSON.stringify(options.graph)) as Record<
    string,
    { inputs: Record<string, unknown> }
  >
  const refNodes = options.refImageNodes ?? []
  const refs = options.refs ?? []
  for (let index = 0; index < refNodes.length; index += 1) {
    const nodeId = refNodes[index]
    if (!graph[nodeId]) continue
    if (index < refs.length) {
      const name = await uploadImage(base, refs[index]!)
      graph[nodeId].inputs = { ...graph[nodeId].inputs, image: name }
    }
  }

  // 提交
  const clientId = `manvo-${Date.now()}`
  const submit = await fetch(`${base}/prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: graph, client_id: clientId }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!submit.ok) {
    throw new Error(
      `ComfyUI 提交失败 ${submit.status}：${(await submit.text()).slice(0, 300)}`,
    )
  }
  const { prompt_id: promptId } = (await submit.json()) as { prompt_id: string }

  // 轮询
  const deadline = Date.now() + (options.timeoutMs ?? 15 * 60_000)
  let history: {
    status?: { completed?: boolean; status_str?: string }
    outputs?: Record<string, Record<string, { filename: string; subfolder?: string; type?: string }[]>>
  } | undefined
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const data = (await comfyJson(`${base}/history/${promptId}`)) as Record<
      string,
      typeof history
    >
    history = data[promptId]
    if (history?.status?.completed) break
    if (history?.status?.status_str === "error") {
      throw new Error("ComfyUI 执行出错（节点报错，详见 ComfyUI 日志）")
    }
  }
  if (!history?.status?.completed) {
    throw new Error("ComfyUI 生成超时，可稍后在任务记录中重试")
  }

  // 取回产物
  const outputs: ComfyOutput[] = []
  for (const nodeOutputs of Object.values(history.outputs ?? {})) {
    for (const kind of ["images", "videos", "gifs", "audio"] as const) {
      for (const item of nodeOutputs[kind] ?? []) {
        const params = new URLSearchParams({
          filename: item.filename,
          subfolder: item.subfolder ?? "",
          type: item.type ?? "output",
        })
        const view = await fetch(`${base}/view?${params}`)
        if (!view.ok) continue
        const arrayBuffer = await view.arrayBuffer()
        outputs.push({
          filename: item.filename,
          subfolder: item.subfolder ?? "",
          type: item.type ?? "output",
          bytes: Buffer.from(arrayBuffer),
          mimeType: guessMime(item.filename, kind),
        })
      }
    }
  }
  if (outputs.length === 0) throw new Error("ComfyUI 未返回任何产物")
  return outputs
}

function guessMime(filename: string, kind: string): string {
  if (filename.endsWith(".mp4") || kind === "videos" || kind === "gifs")
    return filename.endsWith(".webm") ? "video/webm" : "video/mp4"
  if (filename.endsWith(".png")) return "image/png"
  if (filename.endsWith(".webp")) return "image/webp"
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
    return "image/jpeg"
  if (filename.endsWith(".wav")) return "audio/wav"
  if (filename.endsWith(".mp3")) return "audio/mpeg"
  return "application/octet-stream"
}

/** 把产物落到 MediaFile（浏览器经 /api/media/{id} 访问）。 */
export async function storeOutput(
  workspaceId: string,
  output: ComfyOutput,
  label: string,
): Promise<string> {
  const media = await prisma.mediaFile.create({
    data: {
      workspaceId,
      name: `${label}-${output.filename}`.slice(0, 200),
      mimeType: output.mimeType,
      bytes: new Uint8Array(output.bytes),
    },
    select: { id: true },
  })
  return `/api/media/${media.id}`
}
