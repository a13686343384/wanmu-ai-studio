import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/api'
import { requireScriptAccess } from '@/lib/session'
import { getAIService } from '@/services/ai'
import { groupShots } from '@/lib/workflow/episode-state'
import { splitStoryboardSchema } from '@/lib/validations/generation'
import { Prisma } from '@prisma/client'
export async function ensureSegments(episodeId:string) {
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Episode" WHERE id=${episodeId} FOR UPDATE`
  const shots=await tx.storyboard.findMany({where:{episodeId},orderBy:{number:'asc'}})
  if(!shots.some(s=>!s.segmentId))return
  for(const [order,group] of groupShots(shots).entries()) {
   if(group.items.every(s=>s.segmentId))continue
   const segment=await tx.segment.create({data:{episodeId,order,title:group.title,note:group.items[0]?.segmentNote}})
   await tx.storyboard.updateMany({where:{id:{in:group.items.map(s=>s.id)},segmentId:null},data:{segmentId:segment.id}})
  }
  if(shots.some(s=>s.videoUrl))await tx.episode.update({where:{id:episodeId},data:{productionStage:'video'}})
 })
}
export async function splitEpisode(scriptId:string,episodeId:string,userId:string,body:unknown,isCancelled:()=>Promise<boolean>=async()=>false) {
 const script=await requireScriptAccess(scriptId,userId)
 const episode=await prisma.episode.findFirst({where:{id:episodeId,scriptId}})
 if(!episode)throw new AppError('分集不存在',404)
 const input=splitStoryboardSchema.parse(body)
 const old=await prisma.storyboard.findMany({where:{episodeId},orderBy:{number:'asc'}})
 if(old.length&&!input.regenerate)return {episodeId,storyboards:old,reused:true}
 const {data,usage}=await getAIService(script.workspaceId).splitStoryboards({episodeTitle:episode.title,content:episode.content,mode:'text',model:input.model})
 if(!data.storyboards.length || data.storyboards.some(s=>!s.description?.trim()))throw new AppError('模型未返回有效分镜，请重试',422)
 if(await isCancelled())throw new AppError('拆分已停止，旧分镜已保留',409)
 const assets=await prisma.script.findUniqueOrThrow({where:{id:scriptId},include:{characters:{include:{costumes:true}},scenes:true,props:true}})
 const rows=data.storyboards.map((s,i)=>({...s,id:crypto.randomUUID(),number:i+1}))
 const storyboards=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Episode" WHERE id=${episodeId} FOR UPDATE`
  const current=await tx.episode.findUniqueOrThrow({where:{id:episodeId}})
  if(current.updatedAt.getTime()!==episode.updatedAt.getTime())throw new AppError('分集已更新，未覆盖现有内容',409)
  await tx.storyboard.deleteMany({where:{episodeId}})
  await tx.segment.deleteMany({where:{episodeId}})
  for(const [order,group] of groupShots(rows).entries()) {
   const segment=await tx.segment.create({data:{episodeId,order,title:group.title,note:group.items[0]?.segmentNote}})
   for(const shot of group.items) {
    const text=`${shot.description} ${shot.dialogue??''}`
    const refs={sceneId:assets.scenes.find(s=>text.includes(s.name))?.id??null,cast:assets.characters.filter(c=>text.includes(c.name)).map(c=>({characterId:c.id,costumeId:c.costumes.find(k=>text.includes(k.name))?.id??c.costumes[0]?.id??null})),propIds:assets.props.filter(p=>text.includes(p.name)).map(p=>p.id)}
    await tx.storyboard.create({data:{id:shot.id,episodeId,number:shot.number,shotType:shot.shotType,description:shot.description,dialogue:shot.dialogue,action:shot.action,camera:shot.camera,duration:shot.duration,segmentId:segment.id,segmentTitle:segment.title,segmentNote:shot.segmentNote,generationParams:{refs,refsRevision:0}}})
   }
  }
  await tx.episode.update({where:{id:episodeId},data:{status:'storyboarded',productionStage:'storyboard',review:Prisma.DbNull}})
  await tx.script.update({where:{id:scriptId},data:{status:'storyboarding',processingStatus:'completed',progress:100,progressLabel:'分镜已拆分，待校验'}})
  return tx.storyboard.findMany({where:{episodeId},orderBy:{number:'asc'}})
 })
 return {episodeId,storyboards,usage}
}
