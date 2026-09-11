import { loadEnvConfig } from '@next/env'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/prisma'
import { listWorkspaceModels, resolveModelWorkspace } from '../../src/services/ai/live/workspace'
loadEnvConfig(process.cwd())
test('model directory and generation use the same authorized workspace, with explicit project scope winning over model inference',async()=>{
 const user=await prisma.user.findFirstOrThrow()
 const spaces=await Promise.all(['A','B'].map(name=>prisma.workspace.create({data:{name:'model-scope-'+name,ownerId:user.id,members:{create:{userId:user.id,role:'owner'}}}})))
 try {
  const [a,b]=await Promise.all(spaces.map((space,i)=>prisma.customModel.create({data:{workspaceId:space.id,name:'model-'+i,kind:'text',baseUrl:'http://127.0.0.1'}})))
  const listed=await listWorkspaceModels(user.id,{workspaceId:spaces[1].id},'text')
  assert.deepEqual(listed.map(m=>m.id),[b.id])
  assert.equal(await resolveModelWorkspace(user.id,{modelId:b.id}),spaces[1].id)
  assert.equal(await resolveModelWorkspace(user.id,{workspaceId:spaces[0].id,modelId:a.id}),spaces[0].id)
  await assert.rejects(resolveModelWorkspace(user.id,{workspaceId:spaces[0].id,modelId:b.id}),(e:any)=>e.statusCode===400)
  const script=await prisma.script.create({data:{workspaceId:spaces[1].id,title:'scope',content:'正文'}})
  assert.equal(await resolveModelWorkspace(user.id,{scriptId:script.id}),spaces[1].id)
  await assert.rejects(resolveModelWorkspace('unauthorized-user',{modelId:b.id}),(e:any)=>e.statusCode===403)
  await assert.rejects(listWorkspaceModels('unauthorized-user',{workspaceId:spaces[0].id},'text'),(e:any)=>e.statusCode===403)
 }finally{await prisma.workspace.deleteMany({where:{id:{in:spaces.map(s=>s.id)}}});await prisma.$disconnect()}
})
