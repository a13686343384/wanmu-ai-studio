import { jsonOk, withErrorHandling } from '@/lib/api'
import { requireUser } from '@/lib/session'
import { generateStoryboard } from '@/services/storyboards/generate'
export const POST=withErrorHandling(async(req:Request,{params}:{params:{id:string}})=>{
 const user=await requireUser()
 return jsonOk(await generateStoryboard(params.id,user.id,await req.json()))
})
