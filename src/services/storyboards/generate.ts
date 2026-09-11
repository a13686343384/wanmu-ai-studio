import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/api'
import { getAIService } from '@/services/ai'
import { generateStoryboardSchema } from '@/lib/validations/generation'
import { resolveStoryboardGenerationInput } from '@/lib/storyboards/references-server'
import { getRefsRevision } from '@/lib/storyboards/references'
import { requireVideoReview } from './review'
import type { Prisma } from '@prisma/client'
export async function generateStoryboard(id:string,userId:string,body:unknown,isCancelled:()=>Promise<boolean>=async()=>false,taskId?:string,service?:Pick<import('@/services/ai').AIService,'generateImage'|'generateVideo'>) {
 const input=generateStoryboardSchema.parse(body)
 const shot=await prisma.storyboard.findFirst({where:{id,episode:{script:{workspace:{members:{some:{userId}}}}}},include:{episode:{include:{script:true}},segment:true}})
 if(!shot)throw new AppError('分镜不存在或无权访问',404)
 if(input.kind==='video') await requireVideoReview(shot.episodeId)
 const source=await resolveStoryboardGenerationInput(id,userId)
 const script=shot.episode.script
 const products=(shot.segment?.products ?? {}) as Record<string,string>
 const requestId=crypto.randomUUID()
 const previous=(shot.generationParams ?? {}) as Prisma.JsonObject
 const acquired=await prisma.storyboard.updateMany({where:{id,status:{not:'generating'},updatedAt:shot.updatedAt},data:{status:'generating',generationParams:{...previous,requestId,taskId:taskId??null}}})
 if(!acquired.count) throw new AppError('该镜头正在生成，请等待当前任务完成',409)
 try {
  const prompt=[script.visualStyle && `视觉风格：${script.visualStyle}`,source.prompt,input.prompt,products.crowdPlan && `人群调度：${products.crowdPlan}`].filter(Boolean).join('\n')
  const references=[...source.references,...(products.blockingPlanUrl?[{name:products.blockingPlanUrl,kind:'image' as const}]:[])]
  const ai=service??getAIService(script.workspaceId)
  const common={prompt,model:input.model,aspectRatio:input.aspectRatio ?? script.targetAspect,resolution:input.resolution,negativePrompt:input.negativePrompt ?? shot.negativePrompt ?? undefined,references}
  const result=input.kind==='image'?await ai.generateImage({...common,count:1}):await ai.generateVideo({...common,duration:input.duration ?? `${shot.duration ?? 5}s`,skipStoryboardImage:input.skipStoryboardImage,firstFrameUrl:input.skipStoryboardImage?undefined:shot.imageUrl ?? products.firstFrameUrl ?? undefined})
  const url='images' in result.data?result.data.images[0]?.url:result.data.video.url
  if(!url)throw new AppError('模型未返回有效产物',502)
  if(await isCancelled())throw new AppError('任务已停止，未覆盖原产物',409)
  const updated=await prisma.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Storyboard" WHERE id=${id} FOR UPDATE`
   const current=await tx.storyboard.findUniqueOrThrow({where:{id}})
   const currentParams=(current.generationParams ?? {}) as Prisma.JsonObject
   const fields=['description','action','camera','duration','dialogue','negativePrompt','shotType','prompt','imageUrl'] as const
   if(currentParams.requestId!==requestId || getRefsRevision(current.generationParams)!==source.refsRevision || fields.some(field=>current[field]!==shot[field]))throw new AppError('生成期间镜头或引用已更新，请重新生成',409)
   if(taskId && (await tx.generationTask.findUnique({where:{id:taskId}}))?.state!=='running')throw new AppError('任务已停止，未覆盖原产物',409)
   const imageStale=input.kind==='image'?false:Boolean(currentParams.imageStale)
   const videoStale=input.kind==='video'?false:Boolean(currentParams.videoStale ?? (current.videoUrl && currentParams.outputsStale))
   const params={...currentParams,generatedRefsRevision:source.refsRevision,generationInputSummary:source.inputSummary,imageStale,videoStale,outputsStale:imageStale||videoStale,requestId:null,taskId:null}
   const updated=await tx.storyboard.update({where:{id},data:{[input.kind==='image'?'imageUrl':'videoUrl']:url,prompt,model:result.usage.model,status:'completed',generationParams:params}})
   if(input.kind==='video') await tx.episode.update({where:{id:shot.episodeId},data:{productionStage:'video'}})
   await tx.script.update({where:{id:script.id},data:{updatedAt:new Date()}})
   return updated
  })
  return {kind:input.kind,storyboard:updated,usage:result.usage}
 } catch(error) {
  await prisma.storyboard.updateMany({where:{id,generationParams:{path:['requestId'],equals:requestId}},data:{status:'failed'}})
  throw error
 }
}
