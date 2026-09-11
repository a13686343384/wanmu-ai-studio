import { z } from 'zod'
export const reviewIssueSchema=z.object({
 id:z.string().min(1), severity:z.enum(['blocking','advisory']),
 storyboardIds:z.array(z.string()).min(1),reason:z.string().min(1),
 action:z.enum(['edit','resplit','attachScene','firstFrame','blockingPlan','extendVideo']),
})
export type ReviewIssue=z.infer<typeof reviewIssueSchema>
export const reviewSchema=z.object({issues:z.array(reviewIssueSchema).max(100)})
export function parseReview(value:unknown,ids:string[]) {
 const data=reviewSchema.parse(value)
 if(data.issues.some(i=>i.storyboardIds.some(id=>!ids.includes(id)))) throw new Error('校验结果包含其他分集镜头')
 return data
}
export function canGenerate(report:{inputRevision:string;issues:{severity:string}[];advisoriesAcknowledged?:boolean}|null,revision:string) {
 return !!report && report.inputRevision===revision && !report.issues.some(i=>i.severity==='blocking') && (!report.issues.some(i=>i.severity==='advisory') || report.advisoriesAcknowledged===true)
}
