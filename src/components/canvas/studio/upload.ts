import { toast } from "sonner"
export async function uploadStudioMedia(
  projectId: string,
  file: File,
): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error("素材大小须在 20MB 以内")
  const form = new FormData()
  form.set("projectId", projectId)
  form.set("file", file)
  const notice = toast.loading("正在上传素材…")
  try {
    const res = await fetch("/api/media", { method: "POST", body: form })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.error ?? "上传失败")
    return payload.data.url
  } finally {
    toast.dismiss(notice)
  }
}
