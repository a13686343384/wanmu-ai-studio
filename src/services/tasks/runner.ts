import { prisma } from '@/lib/prisma'
import { splitEpisode } from '@/services/storyboards/split'
import { validateEpisode, requireVideoReview } from '@/services/storyboards/review'
import { generateStoryboard } from '@/services/storyboards/generate'
import { runSegmentAssets } from '@/services/segments/assets'
import { taskCancelled, taskProgress } from './store'
import type { GenerationTask, Prisma } from '@prisma/client'
export async function executeTask(task:GenerationTask):Promise<Prisma.InputJsonValue> {
 const input=task.payload as {scriptId:string;episodeId:string;segmentId?:string;body:Record<string,unknown>}
 const cancelled=()=>taskCancelled(task.id)
 const progress=(completed:number,failed:number,total:number|null,label:string)=>taskProgress(task.id,completed,failed,total,label)
 if(task.kind==='split') {
  await progress(0,0,null,'AI正在拆分镜')
  const result=await splitEpisode(input.scriptId,input.episodeId,task.userId,input.body,cancelled)
  await progress(1,0,1,'拆分完成，等待校验')
  return JSON.parse(JSON.stringify(result))
 }
 if(task.kind==='validate') {
  await progress(0,0,null,'大模型正在校验')
  const result=await validateEpisode(input.episodeId,String(input.body.model??'auto'))
  await progress(1,0,1,'校验完成')
  return result as unknown as Prisma.InputJsonValue
 }
 if(task.kind==='segment_assets') {
  if(['fill','regenerate'].includes(String(input.body.action)))await requireVideoReview(input.episodeId)
  const result=await runSegmentAssets({...input.body,segmentId:input.segmentId!,userId:task.userId} as Parameters<typeof runSegmentAssets>[0],p=>progress(p.completed,p.failed,p.total,p.currentLabel),cancelled)
  return JSON.parse(JSON.stringify(result))
 }
 if(task.kind!=='video_batch')throw new Error('不支持的任务类型')
 await requireVideoReview(input.episodeId)
 const shots=await prisma.storyboard.findMany({where:{episodeId:input.episodeId,OR:[{videoUrl:null},{generationParams:{path:['videoStale'],equals:true}},{generationParams:{path:['outputsStale'],equals:true}}]},orderBy:{number:'asc'}})
 let completed=0,failed=0;const failures:{id:string;error:string}[]=[]
 for(const shot of shots) {
  if(await cancelled())break
  await progress(completed,failed,shots.length,`正在生成镜头${shot.number}`)
  try {await generateStoryboard(shot.id,task.userId,{...input.body,kind:'video',model:input.body.model??'auto',prompt:input.body.prompt??'按分镜及引用生成视频'},cancelled,task.id);completed++}
  catch(error){if(await cancelled())break;failed++;failures.push({id:shot.id,error:error instanceof Error?error.message:'生成失败'})}
  await progress(completed,failed,shots.length,`完成${completed}，失败${failed}`)
 }
 return {completed,failed,failures}
}
