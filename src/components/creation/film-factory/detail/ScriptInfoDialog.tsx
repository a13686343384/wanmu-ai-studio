"use client"

import { ArrowRight, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/creation/film-factory/StatusBadge"
import { WORK_TYPES } from "@/lib/constants"
import type { ScriptDetail } from "@/lib/serializers/script"

const WORK_TYPE_LABEL = Object.fromEntries(WORK_TYPES.map((w) => [w.value, w.label]))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      {children}
    </section>
  )
}

/**
 * 查看全部信息弹窗（img-16）：
 * 剧本信息 / 创意来源 / 叙事要求 / 角色概览 / 故事梗概 / 第一集预览，
 * 底部入口进入「平台节奏档案」。
 */
export function ScriptInfoDialog({
  open,
  onOpenChange,
  script,
  onOpenPacing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: ScriptDetail
  onOpenPacing: () => void
}) {
  const firstEpisode = script.episodes[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>剧本信息</DialogTitle>
          <DialogDescription>
            {script.totalEpisodes} 集 × {script.episodeDuration}s · 共{" "}
            {Math.round((script.totalEpisodes * script.episodeDuration) / 60)} 分钟 ·
            状态见顶部标签
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="剧本信息">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: "标题", value: script.title },
                { label: "类型", value: WORK_TYPE_LABEL[script.workType] ?? script.workType },
                { label: "题材", value: script.genre ?? "—" },
                { label: "基调", value: script.tone ?? "—" },
                { label: "目标画幅", value: script.targetAspect },
                { label: "集数 / 时长", value: `${script.totalEpisodes} 集 · ${script.episodeDuration}s` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
                  <p className="text-[10px] text-zinc-600">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-300">{item.value}</p>
                </div>
              ))}
            </div>
            <StatusBadge status={script.status} processing={script.processingStatus} />
          </Section>

          <Section title="创意来源">
            <p className="text-xs leading-relaxed text-zinc-400">
              {script.synopsis ?? "未填写创意来源。"}
            </p>
          </Section>

          <Section title="叙事要求">
            <p className="text-xs leading-relaxed text-zinc-400">
              {script.narrativeStyle ?? "未填写叙事要求。基础叙事：视角设定 / 核心冲突 / 故事走向。"}
            </p>
          </Section>

          <Section title="角色概览">
            {script.characters.length === 0 ? (
              <p className="text-xs text-zinc-600">尚未提取角色。</p>
            ) : (
              <ul className="space-y-1">
                {script.characters.map((character) => (
                  <li key={character.id} className="text-xs leading-relaxed text-zinc-400">
                    <span className="font-medium text-zinc-300">{character.name}</span>
                    <span className="ml-1.5 text-zinc-600">
                      {character.description.slice(0, 50)}
                      {character.description.length > 50 ? "…" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="故事梗概">
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
              {script.content.slice(0, 800)}
              {script.content.length > 800 ? "…" : ""}
            </p>
          </Section>

          {firstEpisode && (
            <Section title={`第一集预览 · ${firstEpisode.title}`}>
              <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">
                {firstEpisode.content.slice(0, 400)}
                {firstEpisode.content.length > 400 ? "…" : ""}
              </p>
            </Section>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-3">
          <span className="text-[10px] text-zinc-600">编辑平台节奏档案（按作品类型自动派生）</span>
          <Button variant="outline" size="sm" onClick={onOpenPacing}>
            <Wand2 className="h-3.5 w-3.5" />
            平台节奏档案
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
