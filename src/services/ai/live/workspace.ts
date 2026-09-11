import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/api'
import { requireDefaultWorkspace } from '@/lib/session'
export interface ModelScope {workspaceId?:string;scriptId?:string;projectId?:string;writingProjectId?:string;modelId?:string}
/** Resolve resource scope before dispatch; callers may not combine resources from different workspaces. */
export async function resolveModelWorkspace(userId:string,input:ModelScope) {
 const scopes:string[]=[]
 if(input.workspaceId)scopes.push(input.workspaceId)
 for(const [kind,id] of [['script',input.scriptId],['project',input.projectId],['writing',input.writingProjectId]] as const) {
  if(!id)continue
  const record=kind==='script'?await prisma.script.findUnique({where:{id},select:{workspaceId:true}}):kind==='project'?await prisma.project.findUnique({where:{id},select:{workspaceId:true}}):await prisma.writingProject.findUnique({where:{id},select:{workspaceId:true}})
  if(!record)throw new AppError('项目不存在',404)
  scopes.push(record.workspaceId)
 }
 const model=input.modelId && input.modelId!=='auto'?await prisma.customModel.findUnique({where:{id:input.modelId},select:{workspaceId:true}}):null
 if(model)scopes.push(model.workspaceId)
 if(new Set(scopes).size>1)throw new AppError('所选模型与当前项目工作区不一致，请重新选择',400)
 const workspaceId=scopes[0]??(await requireDefaultWorkspace(userId)).id
 if(!await prisma.workspaceMember.findUnique({where:{userId_workspaceId:{userId,workspaceId}}}))throw new AppError('无权使用该工作区模型',403)
 return workspaceId
}
export async function listWorkspaceModels(userId:string,scope:ModelScope,kind?:string|null) {
 const workspaceId=await resolveModelWorkspace(userId,scope)
 return prisma.customModel.findMany({where:{workspaceId,enabled:true,...(kind?{kind}:{})},orderBy:{createdAt:'desc'},select:{id:true,name:true,kind:true,cost:true,templateKey:true}})
}
