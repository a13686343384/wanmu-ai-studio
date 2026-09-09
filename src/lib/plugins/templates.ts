/**
 * 插件模型模板注册表（备忘录第五节 16 个模板，逐字转录）。
 * 每个模板 = 可视化表单的默认值 + 请求体示例，保存后实例化为 CustomModel。
 */

export type ModelKind = "text" | "image" | "video" | "audio"

export interface ModelTemplate {
  key: string
  title: string
  kind: ModelKind
  lifecycle: "sync" | "async"
  /** 与备忘录 JSON 一致的结构化默认值 */
  config: Record<string, unknown>
  /** 备忘录中的「请求体模板 body」原文（展示用） */
  previewBody: string
}

const RATIOS_IMAGE = [
  "1:1", "4:5", "5:4", "3:4", "4:3", "2:3", "3:2", "9:16", "16:9", "21:9",
]
const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"]
const IMAGE_QUALITIES = ["low", "medium", "high"]

export const MODEL_TEMPLATES: readonly ModelTemplate[] = [
  {
    key: "chat-openai",
    title: "对话补全 · OpenAI 兼容",
    kind: "text",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "messages": [{ "role": "user", "content": "{{prompt}}" }],
  "max_tokens": "{{max_tokens | int}}",
  "temperature": "{{temperature}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: { prompt_max_chars: 0 },
      submit: {
        method: "POST",
        path: "/v1/chat/completions",
        timeout_sec: 300,
        body: {
          model: "{{model_id}}",
          messages: [{ role: "user", content: "{{prompt}}" }],
          max_tokens: "{{max_tokens | int}}",
          temperature: "{{temperature}}",
        },
      },
      extract: {
        text: ["choices.0.message.content"],
        error: ["error.message"],
      },
    },
  },
  {
    key: "chat-anthropic",
    title: "对话补全 · Anthropic 兼容",
    kind: "text",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "max_tokens": "{{max_tokens | int}}",
  "messages": [{ "role": "user", "content": "{{prompt}}" }]
}`,
    config: {
      auth: {
        header: "x-api-key",
        scheme: "",
        extra_headers: { "anthropic-version": "2023-06-01" },
      },
      constraints: { prompt_max_chars: 0 },
      submit: {
        method: "POST",
        path: "/v1/messages",
        timeout_sec: 300,
        body: {
          model: "{{model_id}}",
          max_tokens: "{{max_tokens | int}}",
          messages: [{ role: "user", content: "{{prompt}}" }],
        },
      },
      extract: { text: ["content.0.text"], error: ["error.message"] },
    },
  },
  {
    key: "chat-gemini",
    title: "对话补全 · Gemini 兼容",
    kind: "text",
    lifecycle: "sync",
    previewBody: `{
  "contents": [{ "role": "user", "parts": [{ "text": "{{prompt}}" }] }],
  "generationConfig": {
    "maxOutputTokens": "{{max_tokens | int}}",
    "temperature": "{{temperature}}"
  }
}`,
    config: {
      auth: { header: "x-goog-api-key", scheme: "" },
      constraints: { prompt_max_chars: 0 },
      submit: {
        method: "POST",
        path: "/v1beta/models/{{model_id}}:generateContent",
        timeout_sec: 300,
        body: {
          contents: [{ role: "user", parts: [{ text: "{{prompt}}" }] }],
          generationConfig: {
            maxOutputTokens: "{{max_tokens | int}}",
            temperature: "{{temperature}}",
          },
        },
      },
      extract: {
        text: ["candidates.0.content.parts.0.text"],
        error: ["error.message"],
      },
    },
  },
  {
    key: "txt2img",
    title: "纯文生图",
    kind: "image",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}",
  "size": "{{size}}",
  "quality": "{{image_quality | default:\"high\"}}",
  "n": "{{count | int}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      heartbeat: false,
      constraints: {
        ratios: RATIOS_IMAGE,
        image_resolutions: IMAGE_RESOLUTIONS,
        image_qualities: IMAGE_QUALITIES,
        size_table: "gpt_image_2_official",
        max_references: 0,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/images/generations",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          n: "{{count | int}}",
        },
      },
      extract: {
        url: ["data.0.url"],
        b64: ["data.0.b64_json"],
        error: ["error.message"],
      },
      result: { download: true, mime: "image/png", count: 1 },
    },
  },
  {
    key: "img2img-url",
    title: "文生图 + 图生图 · 参考图给链接",
    kind: "image",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}",
  "size": "{{size}}",
  "quality": "{{image_quality | default:\"high\"}}",
  "image": "{{refs}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      heartbeat: false,
      refs_plain_url: false,
      refs_url_only: false,
      constraints: {
        ratios: RATIOS_IMAGE,
        image_resolutions: IMAGE_RESOLUTIONS,
        image_qualities: IMAGE_QUALITIES,
        size_table: "gpt_image_2_official",
        max_references: 6,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/images/generations",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          n: "{{count | int}}",
        },
      },
      edits: {
        method: "POST",
        path: "/v1/images/edits",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          image: "{{refs}}",
        },
      },
      extract: {
        url: ["data.0.url"],
        b64: ["data.0.b64_json"],
        error: ["error.message"],
      },
      result: { download: true, mime: "image/png", count: 1 },
    },
  },
  {
    key: "img2img-file",
    title: "文生图 + 图生图 · 参考图传文件",
    kind: "image",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}",
  "size": "{{size}}",
  "quality": "{{image_quality | default:\"high\"}}",
  "n": "{{count | int}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      heartbeat: false,
      constraints: {
        ratios: RATIOS_IMAGE,
        image_resolutions: IMAGE_RESOLUTIONS,
        image_qualities: IMAGE_QUALITIES,
        size_table: "gpt_image_2_official",
        max_references: 6,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/images/generations",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          n: "{{count | int}}",
        },
      },
      edits: {
        method: "POST",
        path: "/v1/images/edits",
        encoding: "multipart",
        file_field: "image",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
        },
      },
      extract: {
        url: ["data.0.url"],
        b64: ["data.0.b64_json"],
        error: ["error.message"],
      },
      result: { download: true, mime: "image/png", count: 1 },
    },
  },
  {
    key: "img2img-b64",
    title: "文生图 + 图生图 · 参考图转 base64",
    kind: "image",
    lifecycle: "sync",
    previewBody: `body 1: 无 refs；body 2: "image": "{{refs}}"`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      heartbeat: false,
      refs_b64: true,
      constraints: {
        ratios: RATIOS_IMAGE,
        image_resolutions: IMAGE_RESOLUTIONS,
        image_qualities: IMAGE_QUALITIES,
        size_table: "gpt_image_2_official",
        max_references: 6,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/images/generations",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          n: "{{count | int}}",
        },
      },
      edits: {
        method: "POST",
        path: "/v1/images/edits",
        timeout_sec: 600,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          image: "{{refs}}",
        },
      },
      extract: {
        url: ["data.0.url"],
        b64: ["data.0.b64_json"],
        error: ["error.message"],
      },
      result: { download: true, mime: "image/png", count: 1 },
    },
  },
  {
    key: "img2img-poll",
    title: "文生图 + 图生图 · 提交后轮询",
    kind: "image",
    lifecycle: "async",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}",
  "size": "{{size}}",
  "quality": "{{image_quality | default:\"high\"}}",
  "image_urls": "{{refs}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: RATIOS_IMAGE,
        image_resolutions: IMAGE_RESOLUTIONS,
        image_qualities: IMAGE_QUALITIES,
        size_table: "gpt_image_2_official",
        max_references: 4,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/tasks",
        timeout_sec: 120,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          size: "{{size}}",
          quality: "{{image_quality | default:\"high\"}}",
          image_urls: "{{refs}}",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/tasks/{{id}}",
        interval_sec: 3,
        deadline_sec: 900,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.output.0"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
        b64: ["data.output_b64"],
      },
      result: { download: true, mime: "image/png", count: 1 },
    },
  },
  {
    key: "vid-url",
    title: "文生视频 + 图生视频 · 参考图给链接",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}",
  "ratio": "{{ratio}}",
  "resolution": "{{resolution}}",
  "duration": "{{duration | int}}",
  "image_urls": "{{refs}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      refs_plain_url: false,
      refs_url_only: false,
      constraints: {
        ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
        resolutions: ["480p", "720p", "1080p"],
        duration: { min: 4, max: 12 },
        max_references: 4,
        inputs: {
          image: { max: 4 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        require_reference: false,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs}}",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "vid-assets",
    title: "文生视频 + 图生视频 · 素材要先入库",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "assets": "{{refs | as_json_objects}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
        resolutions: ["720p"],
        duration: { min: 4, max: 10 },
        max_references: 6,
        inputs: {
          image: { max: 6 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        require_reference: false,
        prompt_max_chars: 0,
      },
      ref_register: {
        register: {
          method: "POST",
          path: "/v1/assets/upload",
          encoding: "multipart",
          file_field: "file",
          timeout_sec: 120,
          body: {},
          id: ["data.asset_id"],
          capture: { assetId: ["data.asset_id"] },
        },
        as_ref: { assetId: "{{assetId}}", type: "image" },
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          assets: "{{refs | as_json_objects}}",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "vid-first-last",
    title: "视频 · 首尾帧",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "image_urls": "{{refs}}",
  "mode": "frames2video"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: ["16:9", "9:16", "1:1"],
        resolutions: ["720p", "1080p"],
        duration: { min: 5, max: 10 },
        max_references: 2,
        inputs: {
          image: { max: 2 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        first_last_frame: true,
        require_reference: false,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs}}",
        },
      },
      first_last: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs}}",
          mode: "frames2video",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "vid-omni",
    title: "视频 · 全能参考（图 + 视频 + 音频）",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "image_urls": "{{refs}}",
  "video_urls": "{{video_refs}}",
  "audio_urls": "{{audio_refs}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: ["16:9", "9:16", "1:1"],
        resolutions: ["720p", "1080p"],
        duration: { min: 5, max: 10 },
        max_references: 2,
        inputs: {
          image: { max: 2 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        first_last_frame: true,
        require_reference: false,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs}}",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "vid-first-last-omni",
    title: "视频 · 首尾帧 + 全能参考",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "image_urls": "{{refs | urls}}",
  "video_urls": "{{video_refs | urls}}",
  "audio_urls": "{{audio_refs | urls}}",
  "mode": "frames2video"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
        resolutions: ["480p", "720p", "1080p"],
        duration: { min: 4, max: 15 },
        max_references: 9,
        inputs: {
          image: { max: 9 },
          video: { max: 3, max_total_duration: 15 },
          audio: { max: 3, max_total_duration: 15 },
        },
        first_last_frame: true,
        require_reference: false,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio | default:\"16:9\"}}",
          resolution: "{{resolution | default:\"720p\"}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs | urls}}",
          video_urls: "{{video_refs | urls}}",
          audio_urls: "{{audio_refs | urls}}",
        },
      },
      first_last: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 180,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio | default:\"16:9\"}}",
          resolution: "{{resolution | default:\"720p\"}}",
          duration: "{{duration | int}}",
          image_urls: "{{refs | urls}}",
          video_urls: "{{video_refs | urls}}",
          audio_urls: "{{audio_refs | urls}}",
          mode: "frames2video",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "vid-b64",
    title: "视频 · 参考素材转 base64",
    kind: "video",
    lifecycle: "async",
    previewBody: `{
  "reference_images": "{{refs_b64}}",
  "reference_audios": "{{audio_refs_b64}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        ratios: ["16:9", "9:16", "1:1"],
        resolutions: ["720p"],
        duration: { min: 4, max: 10 },
        max_references: 3,
        inputs: {
          image: { max: 3 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 2, max_total_duration: 15 },
        },
        require_reference: false,
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/video/generate",
        timeout_sec: 300,
        body: {
          model: "{{model_id}}",
          prompt: "{{prompt}}",
          ratio: "{{ratio}}",
          resolution: "{{resolution}}",
          duration: "{{duration | int}}",
          reference_images: "{{refs_b64}}",
          reference_audios: "{{audio_refs_b64}}",
        },
      },
      poll: {
        method: "GET",
        path: "/v1/video/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.video_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "video/mp4" },
    },
  },
  {
    key: "music-poll",
    title: "音乐 · 提交后轮询",
    kind: "audio",
    lifecycle: "async",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        max_references: 0,
        inputs: {
          image: { max: 0 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/music/generate",
        timeout_sec: 180,
        body: { model: "{{model_id}}", prompt: "{{prompt}}" },
      },
      poll: {
        method: "GET",
        path: "/v1/music/status/{{id}}",
        interval_sec: 5,
        deadline_sec: 3600,
        timeout_sec: 30,
        not_found_grace: 3,
      },
      extract: {
        id: ["data.task_id"],
        status: "data.status",
        progress: "data.progress",
        url: ["data.audio_url"],
        error: ["data.error_message", "data.error"],
        status_map: { done: ["success", "succeeded"], fail: ["failed", "error"] },
      },
      result: { download: true, mime: "audio/mpeg", count: 1 },
    },
  },
  {
    key: "sfx-sync",
    title: "音效 · 一次返回",
    kind: "audio",
    lifecycle: "sync",
    previewBody: `{
  "model": "{{model_id}}",
  "prompt": "{{prompt}}"
}`,
    config: {
      auth: { header: "Authorization", scheme: "Bearer" },
      constraints: {
        max_references: 0,
        inputs: {
          image: { max: 0 },
          video: { max: 0, max_total_duration: 0 },
          audio: { max: 0, max_total_duration: 0 },
        },
        prompt_max_chars: 0,
      },
      submit: {
        method: "POST",
        path: "/v1/audio/generate",
        timeout_sec: 300,
        body: { model: "{{model_id}}", prompt: "{{prompt}}" },
      },
      extract: { url: ["data.audio_url"], error: ["error.message"] },
      result: { download: true, mime: "audio/mpeg", count: 1 },
    },
  },
]
