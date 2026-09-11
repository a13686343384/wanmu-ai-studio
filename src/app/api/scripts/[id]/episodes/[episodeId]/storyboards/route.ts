import { jsonOk, withErrorHandling, AppError } from '@/lib/api'
import { requireUser, requireScriptAccess } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { splitEpisode, ensureSegments } from '@/services/storyboards/split'
type Context={params:{id:string;episodeId:string}}
export const GET=withErrorHandling(async(_req:Request,{params}:Context)=>{
 const user=await requireUser();await requireScriptAccess(params.id,user.id)
 const episode=await prisma.episode.findFirst({where:{id:params.episodeId,scriptId:params.id}})
 if(!episode)throw new AppError('分集不存在',404)
 await ensureSegments(episode.id)
 const storyboards=await prisma.storyboard.findMany({where:{episodeId:episode.id},orderBy:{number:'asc'}})
 return jsonOk({episodeId:episode.id,storyboards})
})
export const POST=withErrorHandling(async(req:Request,{params}:Context)=>{
 const user=await requireUser()
 return jsonOk(await splitEpisode(params.id,params.episodeId,user.id,await req.json()),'本集拆分镜完成',201)
})
