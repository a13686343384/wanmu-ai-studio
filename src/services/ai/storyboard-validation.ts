import { parseReview } from '@/lib/validations/storyboard-review'
import { extractJson } from './live/openai-chat'
import type { AIResult, GenerateTextInput, GenerateTextResult, ValidateStoryboardsInput, ValidateStoryboardsResult } from './types'
export async function validateWithText(input:ValidateStoryboardsInput, generate:(input:GenerateTextInput)=>Promise<AIResult<GenerateTextResult>>):Promise<AIResult<ValidateStoryboardsResult>> {
 const response=await generate({model:input.model,workspaceId:input.workspaceId,prompt:JSON.stringify({
 task:'检查分镜的空间、人物造型、道具引用、轴线、动作连续性、时长与衔接。必须解决用blocking，建议用advisory。不得把景别变化自动认定为错误。只返回JSON。',
 schema:{issues:[{id:'unique',severity:'blocking|advisory',storyboardIds:['仅输入中id'],reason:'具体原因',action:'edit|resplit|attachScene|firstFrame|blockingPlan|extendVideo'}]},
 content:input.content,storyboards:input.storyboards,assets:input.assets,
 })})
 return {data:parseReview(extractJson(response.data.text),input.storyboards.map(s=>s.id)),usage:response.usage}
}
export async function mockReview(input:ValidateStoryboardsInput):Promise<AIResult<ValidateStoryboardsResult>> {
 return {data:{issues:input.storyboards.filter(s=>!s.description.trim() || !s.duration || s.duration<=0).map(s=>({id:`invalid-${s.id}`,severity:'blocking' as const,storyboardIds:[s.id],reason:'镜头描述或时长不完整',action:'edit' as const}))},usage:{model:input.model,tapies:0}}
}
