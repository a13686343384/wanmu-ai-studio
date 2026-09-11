import { z } from 'zod'
import { jsonOk, withErrorHandling, AppError } from '@/lib/api'
import { requireUser, requireScriptAccess } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { enqueueTask, publicTask } from '@/services/tasks/store'
import { requireVideoReview } from '@/services/storyboards/review'
import type { Prisma } from '@prisma/client'
import { splitStoryboardSchema, generateStoryboardSchema } from '@/lib/validations/generation'
import { segmentAssetConfigSchema, segmentAssetActionSchema } from '@/lib/storyboards/segment-assets'
const schema=z.object({kind:z.enum(['split','validate','video_batch','segment_assets']),scriptId:z.string(),episodeId:z.string(),segmentId:z.string().optional(),body:z.record(z.unknown()).default({}),idempotencyKey:z.string().min(8).max(120)})
export const POST=withErrorHandling(async(req:Request)=>{
 const user=await requireUser();const input=schema.parse(await req.json());const script=await requireScriptAccess(input.scriptId,user.id)
 const episode=await prisma.episode.findFirst({where:{id:input.episodeId,scriptId:script.id}})
 if(!episode)throw new AppError('分集不存在',404)
 if(input.kind==='split')input.body=splitStoryboardSchema.parse(input.body)
 if(input.kind==='validate')input.body=z.object({model:z.string().min(1).default('auto')}).parse(input.body)
 if(input.kind==='video_batch')input.body=generateStoryboardSchema.parse({...input.body,kind:'video',model:input.body.model??'auto',prompt:input.body.prompt??'按分镜及引用生成视频'})
 if(input.kind==='segment_assets') {
  if(!input.segmentId)throw new AppError('请选择镜组',400)
  input.body=z.object({action:segmentAssetActionSchema,config:segmentAssetConfigSchema}).parse(input.body)
 }
 if(input.kind==='video_batch' || (input.kind==='segment_assets' && ['fill','regenerate'].includes(String(input.body.action))))await requireVideoReview(episode.id)
 if(input.segmentId && !await prisma.segment.findFirst({where:{id:input.segmentId,episodeId:episode.id}}))throw new AppError('镜组不存在',404)
 const task=await enqueueTask({workspaceId:script.workspaceId,userId:user.id,episodeId:episode.id,kind:input.kind,payload:input as Prisma.InputJsonValue,idempotencyKey:input.idempotencyKey})
 return jsonOk(publicTask(task),'任务已排队',202)
})
export const GET=withErrorHandling(async(req:Request)=>{
 const user=await requireUser();const memberships=await prisma.workspaceMember.findMany({where:{userId:user.id},select:{workspaceId:true}})
 const episodeId=new URL(req.url).searchParams.get('episodeId')
 const active=new URL(req.url).searchParams.get('active')==='1'
 const tasks=await prisma.generationTask.findMany({where:{workspaceId:{in:memberships.map(m=>m.workspaceId)},...(episodeId?{episodeId}:{} ),...(active?{state:{in:['queued','running','cancel_requested']}}:{})},orderBy:{createdAt:'desc'},...(active?{}:{take:50})})
 return jsonOk(tasks.map(publicTask))
})
