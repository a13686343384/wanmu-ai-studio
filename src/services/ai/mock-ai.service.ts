import type {
  AIService,
  AIResult,
  AnalyzeScriptInput,
  CharacterDraft,
  ConsultChatInput,
  GenerateTextInput,
  GenerateTextResult,
  ConsultScriptInput,
  ConsultChatResult,
  ConsultScriptResult,
  GenerateAudioInput,
  GenerateAudioResult,
  GenerateSubtitleInput,
  GenerateSubtitleResult,
  GenerateImageInput,
  GenerateImageResult,
  GenerateOutlineInput,
  GenerateOutlineResult,
  GenerateVideoInput,
  GenerateVideoResult,
  OptimizeDialogueInput,
  OptimizeDialogueResult,
  PropDraft,
  SceneDraft,
  ScriptAnalysis,
  SplitStoryboardsInput,
  SplitStoryboardsResult,
  SummarizeEpisodeInput,
  SummarizeEpisodeResult,
  UsageInfo,
} from "./types"
import { mockWriteScript } from "./mock-writing"
import { makePoster, mockDelay } from "./mock-media"
import {
  AUDIO_MODELS,
  IMAGE_MODELS,
  SUBTITLE_MODELS,
  TEXT_MODELS,
  VIDEO_MODELS,
} from "@/lib/constants"

function costOf(
  list: readonly { id: string; cost: number }[],
  modelId: string,
): number {
  return list.find((m) => m.id === modelId)?.cost ?? list[0]?.cost ?? 1
}

function usage(model: string, tapies: number): UsageInfo {
  return { model, tapies }
}

/** 从文本中抽取「第N集」或 --- 分隔的段落，用于推导集数。 */
function splitEpisodes(content: string): string[] {
  const byMarker = content.split(/\n\s*---\s*\n/)
  if (byMarker.length > 1) return byMarker.map((s) => s.trim()).filter(Boolean)

  const byTitle = content.split(/\n(?=第\s*[0-9一二三四五六七八九十百]+\s*集)/)
  if (byTitle.length > 1) return byTitle.map((s) => s.trim()).filter(Boolean)

  return [content.trim()]
}

/** 抽取人名的启发式：中文 2-3 字且出现次数 ≥2 的片段。 */
function guessNames(content: string, limit = 6): string[] {
  const candidates = content.match(/[\u4e00-\u9fa5]{2,3}/g) ?? []
  const counts = new Map<string, number>()
  for (const word of candidates) {
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  const stop = new Set([
    "一个",
    "他们",
    "自己",
    "什么",
    "这个",
    "那个",
    "已经",
    "因为",
    "所以",
    "但是",
    "可以",
    "然后",
    "没有",
    "不是",
    "就是",
    "还是",
    "如果",
    "时候",
    "东西",
    "地方",
    "问题",
    "第一",
  ])
  return [...counts.entries()]
    .filter(([word, count]) => count >= 2 && !stop.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}

export const mockAIService: AIService = {
  writeScript: mockWriteScript,
  /* ---------------------------- 剧本分析 ---------------------------- */

  async analyzeScript(
    input: AnalyzeScriptInput,
  ): Promise<AIResult<ScriptAnalysis>> {
    await mockDelay(1200, 2200)

    const segments = splitEpisodes(input.content)
    const names = guessNames(input.content)
    const isSciFi = /芯片|系统|数据|废土|机甲|星|太空|未来/.test(input.content)
    const isAncient = /仙|江湖|朝|皇帝|宗门|古/.test(input.content)

    const genre = isSciFi
      ? "科幻/废土/复仇爽剧"
      : isAncient
        ? "古风仙侠/权谋"
        : "都市/情感/悬疑"
    const era = isSciFi ? "近未来废土" : isAncient ? "架空古代" : "当代都市"

    const analysis: ScriptAnalysis = {
      genre,
      narrativeStyle: isSciFi ? "主角单线快节奏升级" : "多线交织、情绪递进",
      visualStyle: isSciFi ? "真人写实电影感" : "高质感实拍",
      costumeStyle: isSciFi
        ? "废土机能风"
        : isAncient
          ? "古装考据风"
          : "都市通勤风",
      era,
      tone: isSciFi ? "冷峻、压迫、爽感" : "细腻、克制、有温度",
      audienceNotes:
        "目标观众偏好强钩子、快节奏、明确爽点；每集需在前 8 秒建立冲突，结尾留悬念。",
      allowed: [
        "强冲突与反转",
        "克制的暴力与压迫感",
        "身份逆袭与爽点释放",
        "情感张力",
      ],
      forbidden: [
        "过度血腥特写",
        "现实政治影射",
        "未成年人不当情节",
        "品牌商标露出",
      ],
      recommendedEpisodes: Math.max(
        segments.length,
        Math.min(60, Math.round(input.content.length / 220) || 12),
      ),
      recommendedDuration: input.workType === "micro_film" ? 600 : 90,
      treatment: `围绕「${names[0] ?? "主角"}」展开：起点是压迫与背叛，中段通过${
        isSciFi ? "获得关键能力" : "抓住关键线索"
      }实现第一次翻盘，后段进入势力对抗，最终以身份揭晓与旧账清算收束。全剧采用强钩子结构，每集一个明确爽点。`,
      episodeIdeas: segments.slice(0, 12).map((segment, index) => {
        const firstLine =
          segment.split("\n").find((line) => line.trim().length > 0) ?? ""
        const title =
          firstLine
            .replace(/^第\s*[0-9一二三四五六七八九十百]+\s*集\s*/, "")
            .slice(0, 12) || `第${index + 1}集`
        return {
          number: index + 1,
          title,
          summary: segment.replace(/\s+/g, " ").slice(0, 88),
        }
      }),
    }

    return {
      data: analysis,
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  /* ---------------------------- 会诊 ---------------------------- */

  async generateText(
    input: GenerateTextInput,
  ): Promise<AIResult<GenerateTextResult>> {
    await mockDelay(500, 1100)

    const topic = input.prompt.trim().slice(0, 60) || "一段新的创作"
    const text = `围绕「${topic}」展开：开场先给出一个具体的画面或动作，把观众拉进情境；中段抛出核心冲突，让人物的动机与代价同时成立；结尾留一个钩子——未说出口的那句话，或刚刚走进画面的那个身影。保持节奏紧凑，每一段都向前推进。`

    return {
      data: { text },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async consultChat(
    input: ConsultChatInput,
  ): Promise<AIResult<ConsultChatResult>> {
    await mockDelay(600, 1200)

    const reply = `收到你的想法（「${input.message.slice(0, 40)}${input.message.length > 40 ? "…" : ""}」）。结合《${input.scriptTitle}》的诊断项「${input.suggestion.slice(0, 24)}…」，建议这样落笔：先在受影响集数前补一场过渡戏交代动机，再把对话精简到功能表达，最后用一个小钩子收尾。确认后点「按勾选生成改法」，我会把整条改写预览出来。`

    return {
      data: { reply },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async consultScript(
    input: ConsultScriptInput,
  ): Promise<AIResult<ConsultScriptResult>> {
    await mockDelay(900, 1800)

    const names = guessNames(input.content)
    const result: ConsultScriptResult = {
      summary: `通读《${input.scriptTitle}》后，整体结构成立、钩子密度足够；主要问题集中在${
        names[1] ? `「${names[1]}」动机铺垫` : "次要人物动机铺垫"
      }、中段节奏与部分台词的功能性表达上。以下按优先级给出诊断项。`,
      suggestions: [
        {
          id: "c-1",
          category: "结构",
          severity: "high",
          issue:
            "第二集转折发生过快，主角获得关键能力前缺少代价铺垫，爽点说服力不足。",
          suggestion:
            "在转折前插入一个 15 秒的「代价场景」：让主角先失去某样东西，再获得能力。",
          mustFix: true,
        },
        {
          id: "c-2",
          category: "人物",
          severity: "high",
          issue: "反派的压迫感依赖台词陈述，缺少行动展示。",
          suggestion:
            "把「他说要弄死他」改为一个具体行动：当众销毁主角唯一的生存凭证。",
          mustFix: true,
        },
        {
          id: "c-3",
          category: "节奏",
          severity: "medium",
          issue: "第三集与第四集信息量重叠，存在冗余。",
          suggestion:
            "合并两集的核心事件，把释放出的时长用于强化第五集的对抗。",
          mustFix: false,
        },
        {
          id: "c-4",
          category: "台词",
          severity: "medium",
          issue: "部分台词偏书面，与角色身份不符。",
          suggestion: "将解释性台词改为动作 + 短句，保留信息但降低说教感。",
          mustFix: false,
        },
        {
          id: "c-5",
          category: "逻辑",
          severity: "low",
          issue: "结尾悬念的触发条件与前文设定存在轻微冲突。",
          suggestion: "补一句前置交代，或在结尾前加一个伏笔镜头。",
          mustFix: false,
        },
      ],
    }

    return {
      data: result,
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async optimizeDialogue(
    input: OptimizeDialogueInput,
  ): Promise<AIResult<OptimizeDialogueResult>> {
    await mockDelay(800, 1500)

    const optimized = input.content
      .replace(/说道|说道：/g, "：")
      .replace(/非常|十分|极其/g, "很")
      .replace(/因此|所以/g, "所以")

    return {
      data: {
        optimized,
        changes: [
          "把解释性长句拆成短句，提升口语节奏",
          "删减重复的副词修饰，让语气更自然",
          "统一人称与称呼，避免前后不一致",
        ],
      },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  /* ---------------------------- 大纲 ---------------------------- */

  async generateOutline(
    input: GenerateOutlineInput,
  ): Promise<AIResult<GenerateOutlineResult>> {
    await mockDelay(1500, 2600)

    const segments = splitEpisodes(input.content)
    const total = Math.max(input.totalEpisodes, segments.length)

    const episodes = Array.from({ length: total }, (_, index) => {
      const segment = segments[index % segments.length] ?? input.content
      const firstLine =
        segment.split("\n").find((line) => line.trim().length > 0) ?? ""
      const title =
        firstLine
          .replace(/^第\s*[0-9一二三四五六七八九十百]+\s*集\s*/, "")
          .slice(0, 14) || `第${index + 1}集`

      return {
        number: index + 1,
        title,
        summary: segment.replace(/\s+/g, " ").slice(0, 100),
        content: segment.slice(0, 2000),
        duration: input.episodeDuration,
      }
    })

    return {
      data: { episodes },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async summarizeEpisode(
    input: SummarizeEpisodeInput,
  ): Promise<AIResult<SummarizeEpisodeResult>> {
    await mockDelay(700, 1400)

    const names = guessNames(input.content, 3)
    return {
      data: {
        recap: `本集《${input.episodeTitle}》的核心是：${
          names[0] ? `${names[0]}` : "主角"
        }在一次压迫性事件中被逼到墙角，随后通过一个关键信息完成第一次反转，结尾留下新的威胁。情绪曲线为「压抑 → 爆发 → 悬置」。`,
        beats: [
          "开场 8 秒：建立压迫环境与倒计时",
          "第一次转折：关键信息/能力出现",
          "对抗升级：反派加码，代价显性化",
          "本集爽点：主角完成第一次翻盘",
          "结尾钩子：新的威胁浮出水面",
        ],
      },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  /* ---------------------------- 资产提取 ---------------------------- */

  async extractCharacters(input: {
    content: string
    model: string
  }): Promise<AIResult<CharacterDraft[]>> {
    await mockDelay(1100, 2000)
    const names = guessNames(input.content, 4)
    const fallback = ["林夜", "江婉", "赵天昊"]

    const list = (names.length ? names : fallback)
      .slice(0, 5)
      .map((name, index) => ({
        name,
        description:
          index === 0
            ? "底层拾荒者，被最亲近的人背叛后获得关键能力，性格冷硬但保留底线。"
            : index === 1
              ? "与主角关系密切却做出关键抉择，动机是自保与生存。"
              : "站在主角对立面的势力代表，手段强硬，习惯用规则压人。",
        appearance:
          index === 0
            ? "二十七八岁，削瘦，短发微乱，右眉有一道旧疤，常穿褪色工装夹克。"
            : "三十岁上下，妆容精致，眼神克制，着装体面。",
        personality: index === 0 ? "隐忍、狠辣、重情" : "精明、务实、善权衡",
      }))

    return {
      data: list,
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async extractScenes(input: {
    content: string
    model: string
  }): Promise<AIResult<SceneDraft[]>> {
    await mockDelay(1000, 1800)

    const list: SceneDraft[] = [
      {
        name: "第九层拾荒区",
        description: "锈蚀的走廊、裸露的管线、成堆的废料，空气里有铁腥味。",
        environment: "废弃工业层，狭窄纵深，两侧是堆叠的金属箱",
        lighting: "顶部探照灯扫射，冷白主光 + 橙色应急灯",
      },
      {
        name: "伊甸园 VIP 通道",
        description: "干净到反光的白色长廊，与下层形成强烈反差。",
        environment: "高层净化区，极简几何结构，玻璃幕墙",
        lighting: "均匀漫射冷光，无阴影",
      },
      {
        name: "数据深渊",
        description: "主角进入系统内部时的抽象空间，蓝色数据流构筑成峡谷。",
        environment: "虚拟空间，无限延伸的数据结构",
        lighting: "自发光的蓝色数据流，体积光",
      },
    ]

    return {
      data: list,
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  async extractProps(input: {
    content: string
    model: string
  }): Promise<AIResult<PropDraft[]>> {
    await mockDelay(900, 1600)

    const list: PropDraft[] = [
      {
        name: "雪崩芯片",
        description: "远古防御系统的核心模块，表面有流动的蓝色纹路。",
      },
      {
        name: "生存凭证",
        description: "第九层居民唯一身份证明，磨损严重的金属卡片。",
      },
      {
        name: "废弃动力锤",
        description: "主角最初的武器，手柄缠着黑胶布，锤面有缺口。",
      },
      {
        name: "VIP 通行环",
        description: "伊甸园高层通行信物，冷白光环，边缘刻有编号。",
      },
    ]

    return {
      data: list,
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },

  /* ---------------------------- 图像 / 视频 / 音频 ---------------------------- */

  async generateImage(
    input: GenerateImageInput,
  ): Promise<AIResult<GenerateImageResult>> {
    await mockDelay(1800, 3200)

    const count = Math.min(Math.max(input.count ?? 1, 1), 4)
    const images = Array.from({ length: count }, (_, index) => ({
      url: makePoster(
        input.prompt,
        `${input.prompt}-${index}`,
        input.aspectRatio,
      ),
      poster: undefined,
      width: undefined,
      height: undefined,
      mimeType: "image/svg+xml",
    }))

    return {
      data: { images },
      usage: usage(input.model, costOf(IMAGE_MODELS, input.model) * count),
    }
  },

  async generateVideo(
    input: GenerateVideoInput,
  ): Promise<AIResult<GenerateVideoResult>> {
    await mockDelay(3000, 5000)

    const poster = makePoster(input.prompt, input.prompt, input.aspectRatio)
    const seconds = Number.parseInt(input.duration.replace(/\D/g, ""), 10) || 5

    return {
      data: {
        video: {
          // Mock 下没有真实视频流，用封面代替，UI 会以封面 + 播放态呈现
          url: poster,
          poster,
          duration: seconds,
          mimeType: "video/mp4",
        },
      },
      usage: usage(input.model, costOf(VIDEO_MODELS, input.model)),
    }
  },

  async generateAudio(
    input: GenerateAudioInput,
  ): Promise<AIResult<GenerateAudioResult>> {
    await mockDelay(1500, 2800)

    const seconds = Number.parseInt(input.duration.replace(/\D/g, ""), 10) || 15

    return {
      data: {
        audio: {
          url: makePoster("音频轨道", input.prompt, "16:9"),
          poster: makePoster("", input.prompt, "16:9"),
          duration: seconds,
          mimeType: "audio/mpeg",
        },
      },
      usage: usage(input.model, costOf(AUDIO_MODELS, input.model)),
    }
  },

  async generateSubtitle(
    input: GenerateSubtitleInput,
  ): Promise<AIResult<GenerateSubtitleResult>> {
    await mockDelay(800, 1500)
    const segments = [
      { start: 0, end: 3.5, text: "（旁白）这是一个关于未来的故事。" },
      { start: 3.5, end: 7.2, text: "在不久的将来，人类与AI共存。" },
      { start: 7.2, end: 11.0, text: "但和平的表象下，暗流涌动。" },
    ]
    const srt = segments
      .map((s, i) => {
        const fmt = (t: number) => {
          const m = Math.floor(t / 60)
          const sec = Math.floor(t % 60)
          const ms = Math.round((t % 1) * 1000)
          return `00:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`
        }
        return `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}`
      })
      .join("\n\n")
    return {
      data: { srt, segments },
      usage: usage(input.model, costOf(SUBTITLE_MODELS, input.model)),
    }
  },

  /* ---------------------------- 分镜 ---------------------------- */

  async splitStoryboards(
    input: SplitStoryboardsInput,
  ): Promise<AIResult<SplitStoryboardsResult>> {
    await mockDelay(1800, 3000)

    const sentences = input.content
      .split(/[。！？\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 4)
      .slice(0, 10)

    const shotTypes = ["远景", "全景", "中景", "近景", "特写"]

    const segmentTitles = [
      "B01·开场·有剧情镜",
      "B02·发展·铺垫镜",
      "B03·对抗·冲突镜",
      "B04·高潮·情绪镜",
      "B05·收束·留白镜",
    ]
    const storyboards = (
      sentences.length ? sentences : ["开场建立环境", "主角入画"]
    ).map((sentence, index) => ({
      number: index + 1,
      shotType: shotTypes[index % shotTypes.length]!,
      description: sentence.slice(0, 60),
      dialogue: /[“"「]/.test(sentence) ? sentence : undefined,
      action: sentence.slice(0, 40),
      camera:
        index % 3 === 0
          ? "缓慢推进"
          : index % 3 === 1
            ? "横移跟拍"
            : "固定机位 + 轻微手持",
      duration: 2 + (index % 3),
      segmentTitle: segmentTitles[Math.floor(index / 6)] ?? segmentTitles[0]!,
      segmentNote:
        index % 6 === 0
          ? "建议出首帧图锁定空间；后续镜头沿用同景别衔接。"
          : undefined,
    }))

    return {
      data: { storyboards },
      usage: usage(input.model, costOf(TEXT_MODELS, input.model)),
    }
  },
}
