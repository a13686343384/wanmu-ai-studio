import { jsonOk, withErrorHandling } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { requireTask, publicTask, cancelTask } from '@/services/tasks/store'
type Context={params:{id:string}}
export const GET=withErrorHandling(async(_req:Request,{params}:Context)=>{const user=await requireUser();return jsonOk(publicTask(await requireTask(params.id,user.id)))})
export const PATCH=withErrorHandling(async(_req:Request,{params}:Context)=>{const user=await requireUser();await requireTask(params.id,user.id);return jsonOk(publicTask(await cancelTask(params.id)))})
