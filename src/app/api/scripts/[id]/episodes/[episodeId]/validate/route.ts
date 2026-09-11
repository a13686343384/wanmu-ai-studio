import { jsonOk, withErrorHandling, AppError } from '@/lib/api'
import { requireUser, requireScriptAccess } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { reviewInput, validateEpisode } from '@/services/storyboards/review'
import { getAiMode } from '@/lib/settings'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
type Context={params:{id:string;episodeId:string}}
async function access(params:Context['params']) {
 const user=await requireUser(); await requireScriptAccess(params.id,user.id)
 const episode=await prisma.episode.findFirst({where:{id:params.episodeId,scriptId:params.id}})
 if(!episode) throw new AppError('分集不存在',404)
 return episode
}
export const GET=withErrorHandling(async(_req:Request,{params}:Context)=>{
 await access(params);const {episode,inputRevision}=await reviewInput(params.episodeId)
 return jsonOk({report:episode.review,inputRevision,mode:await getAiMode()})
})
export const POST=withErrorHandling(async(req:Request,{params}:Context)=>{
 await access(params);const input=z.object({model:z.string().default('auto')}).parse(await req.json())
 return jsonOk(await validateEpisode(params.episodeId,input.model))
})
export const PATCH=withErrorHandling(async(req:Request,{params}:Context)=>{
 await access(params);const {inputRevision}=z.object({inputRevision:z.string()}).parse(await req.json())
 const current=await reviewInput(params.episodeId)
 const report=current.episode.review as Record<string,unknown>|null
 if(!report || current.inputRevision!==inputRevision || report.inputRevision!==inputRevision) throw new AppError('校验已过期，请重新校验',409)
 const updated={...report,advisoriesAcknowledged:true}
 await prisma.episode.update({where:{id:params.episodeId},data:{review:updated as Prisma.InputJsonValue}})
 return jsonOk(updated)
})
