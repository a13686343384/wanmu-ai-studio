import type { AIResult, WriteScriptInput, WriteScriptResult } from "./types"
import { TEXT_MODELS } from "@/lib/constants"
import { mockDelay } from "./mock-media"
/** 离线编剧样例。供应商替换点保持结构化蓝图/分集接口。 */
export async function mockWriteScript(
  input: WriteScriptInput,
): Promise<AIResult<WriteScriptResult>> {
  await mockDelay(600, 1000)
  const characters = input.characters.length
    ? input.characters
    : [
        {
          name: "林舟",
          description:
            "主角，习惯独自承担风险。外在目标是寻找真相，内在需求是学会信任。",
        },
        {
          name: "沈言",
          description: "关键同伴，掌握另一半线索，与主角从互相试探走向合作。",
        },
        {
          name: "顾远",
          description: "阻力人物，试图维护既有秩序，行动背后有尚未公开的动机。",
        },
      ]
  const beats = [
    "异常来信",
    "第一次追踪",
    "错误的证人",
    "交换条件",
    "秘密曝光",
    "最后的选择",
  ]
  let blueprint =
    input.blueprint ||
    `《${input.title}》项目蓝图\n\n故事核心\n${input.idea}\n\n题材定位\n${input.genre}，${input.totalEpisodes} 集，每集约 ${input.episodeDuration} 秒。\n\n主线结构\n开篇：意外打破主角的日常，建立迫切目标。\n发展：线索与阻力交替出现，人物关系在选择中改变。\n转折：看似可靠的证据被推翻，主角必须承担代价。\n结局：回应开场的核心问题，以行动完成成长。\n\n叙事规则\n每集围绕一个可拍摄的冲突展开，以动作、对白推动情节；结尾留下下一集的具体悬念。`
  if (input.instruction)
    blueprint += `\n\n本轮调整方向\n${input.instruction}\n落实到后续正文：突出人物行动的因果关系，并在本集结尾回扣该调整。`
  const episodes = Array.from({ length: input.totalEpisodes }, (_, index) => {
    const number = index + 1
    const old = input.episodes.find((item) => item.number === number)
    const episode = old ?? {
      number,
      title: beats[index % beats.length]!,
      summary: `${input.idea}\n第 ${number} 集围绕「${beats[index % beats.length]}」展开，主角获得新线索，也付出新的代价。`,
      content: "",
    }
    if (number !== input.episodeNumber) return episode
    return {
      ...episode,
      content: `第${number}集 ${episode.title}\n\n第一场 · 夜 · 街口\n人物：${characters[0]!.name}、${characters[1]!.name}\n\n路灯忽明忽暗。${characters[0]!.name}停在路口，反复确认手里的线索。\n${characters[1]!.name}从暗处走来，没有立即靠近。\n\n${characters[0]!.name}：这件事，只有你能解释。\n${characters[1]!.name}：解释之前，你得先决定要不要继续。\n\n第二场 · 内 · 值班室\n桌上铺开资料，两人对照时间，发现一个一直被忽略的矛盾。\n故事线索：${episode.summary}\n${input.instruction ? `调整重点：${input.instruction}\n` : ""}\n${characters[0]!.name}：如果记录是真的，有人在替我们做决定。\n${characters[1]!.name}：那就去见留下记录的人。\n\n第三场 · 夜 · 走廊\n两人来到门前。门缝中透出光，一阵熟悉的声音从里面传来。\n${characters[0]!.name}抬手准备敲门，手机突然亮起——\n“不要进去。”\n\n本集结束。`,
    }
  })
  return {
    data: {
      blueprint,
      characters,
      episodes,
      reply: input.episodeNumber
        ? `第${input.episodeNumber}集正文已写入，保留了既有角色设定。可以继续编辑对白或生成下一集。`
        : input.instruction
          ? "已记录本轮调整并更新蓝图，已有正文保留，可按新方向重新生成选定集。"
          : `蓝图和 ${episodes.length} 集大纲已建立，角色档案已同步。选择一集开始写正文。`,
    },
    usage: {
      model: input.model,
      tapies: TEXT_MODELS.find((model) => model.id === input.model)!.cost,
    },
  }
}
