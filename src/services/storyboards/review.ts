import { getAiMode } from '@/lib/settings'
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/api'
import { getAIService } from '@/services/ai'
import { canGenerate, parseReview } from '@/lib/validations/storyboard-review'
import type { Prisma } from '@prisma/client'
export async function reviewInput(episodeId:string) {
 const episode=await prisma.episode.findUniqueOrThrow({where:{id:episodeId},include:{script:{include:{characters:{include:{costumes:true}},scenes:true,props:true}},storyboards:{orderBy:{number:'asc'}}}})
 const assets={
  characters:episode.script.characters.map(c=>({id:c.id,name:c.name,description:c.description,appearance:c.appearance,personality:c.personality,costumes:c.costumes.map(k=>({id:k.id,name:k.name,description:k.description,situation:k.situation})).sort((a,b)=>a.id.localeCompare(b.id))})).sort((a,b)=>a.id.localeCompare(b.id)),
  scenes:episode.script.scenes.map(s=>({id:s.id,name:s.name,description:s.description,environment:s.environment,lighting:s.lighting})).sort((a,b)=>a.id.localeCompare(b.id)),
  props:episode.script.props.map(p=>({id:p.id,name:p.name,description:p.description,parentCharacterId:p.parentCharacterId})).sort((a,b)=>a.id.localeCompare(b.id)),
 }
 const facts={content:episode.content,assets,storyboards:episode.storyboards.map(s=>({id:s.id,description:s.description,duration:s.duration,shotType:s.shotType,camera:s.camera,action:s.action,dialogue:s.dialogue,refs:(s.generationParams as Record<string,unknown>|null)?.refs}))}
 const inputRevision=createHash('sha256').update(JSON.stringify(facts)).digest('hex')
 return {episode,facts,inputRevision}
}
export async function validateEpisode(episodeId:string,model:string) {
 const {episode,facts,inputRevision}=await reviewInput(episodeId)
 if(!facts.storyboards.length) throw new AppError('请先拆分镜',400)
 const {data}=await getAIService(episode.script.workspaceId).validateStoryboards({...facts,model})
 const report={mode:await getAiMode(),...parseReview(data,episode.storyboards.map(s=>s.id)),inputRevision,advisoriesAcknowledged:false,checkedAt:new Date().toISOString()}
 if((await reviewInput(episodeId)).inputRevision!==inputRevision) throw new AppError('校验期间内容已改变，请重新校验',409)
 await prisma.episode.update({where:{id:episodeId},data:{review:report as Prisma.InputJsonValue}})
 return report
}
export async function requireVideoReview(episodeId:string) {
 const {episode,inputRevision}=await reviewInput(episodeId)
 const report=episode.review as Parameters<typeof canGenerate>[0]
 if(!canGenerate(report,inputRevision) || (episode.review as Record<string,unknown>|null)?.mode !== await getAiMode()) throw new AppError('请先完成出片前校验并处理必须解决项、确认建议',409)
 return {episode,inputRevision}
}
