import { jsonOk,withErrorHandling,AppError } from '@/lib/api'
import { requireUser,requireScriptAccess } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireVideoReview } from '@/services/storyboards/review'
export const POST=withErrorHandling(async(_req:Request,{params}:{params:{id:string;episodeId:string}})=>{
 const user=await requireUser();await requireScriptAccess(params.id,user.id)
 const episode=await prisma.episode.findFirst({where:{id:params.episodeId,scriptId:params.id}})
 if(!episode)throw new AppError('分集不存在',404)
 await requireVideoReview(episode.id)
 const updated=await prisma.episode.update({where:{id:episode.id},data:{productionStage:'video'}})
 return jsonOk(updated)
})
