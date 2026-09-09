import { z } from "zod"
export const writingEpisodeSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  content: z.string().default(""),
})
export const writingSnapshotSchema = z.object({
  blueprint: z.string().default(""),
  characters: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .default([]),
  episodes: z.array(writingEpisodeSchema).default([]),
})
export const writingDocumentSchema = writingSnapshotSchema.extend({
  history: z
    .array(
      writingSnapshotSchema.extend({
        id: z.string(),
        label: z.string(),
        date: z.string(),
      }),
    )
    .default([]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .default([]),
})
export type WritingDocument = z.infer<typeof writingDocumentSchema>
export type WritingSnapshot = z.infer<typeof writingSnapshotSchema>
export interface WritingProjectDTO {
  id: string
  title: string
  genre: string
  idea: string
  totalEpisodes: number
  episodeDuration: number
  revision: number
  document: WritingDocument
  updatedAt: string
  importedScriptId: string | null
}
export function readWritingDocument(value: unknown): WritingDocument {
  return writingDocumentSchema.parse(value)
}
