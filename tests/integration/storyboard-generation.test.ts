import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

test('生成保护：生成期间修改时长拒绝旧响应；取消保留产物；缺校验阻止供应商调用',async()=>{
 const {prisma}=await import('../../src/lib/prisma')
 const {generateStoryboard}=await import('../../src/services/storyboards/generate')
 const user=await prisma.user.create({data:{name:'generation CAS fixture'}})
 const workspace=await prisma.workspace.create({data:{name:'generation CAS fixture',ownerId:user.id,members:{create:{userId:user.id,role:'owner'}}}})
 try {
  const script=await prisma.script.create({data:{workspaceId:workspace.id,title:'generation fixture',content:'小雨走到门口',targetAspect:'16:9'}})
  const episode=await prisma.episode.create({data:{scriptId:script.id,number:1,title:'出发',content:'小雨走到门口'}})
  const shot=await prisma.storyboard.create({data:{episodeId:episode.id,number:1,description:'小雨走到门口',duration:8,imageUrl:'https://fixture.invalid/old.png'}})
  let calls=0
  const service={
   generateImage:async(input:any)=>{
    calls++;assert.equal(input.aspectRatio,'16:9')
    await prisma.storyboard.update({where:{id:shot.id},data:{duration:10}})
    return {data:{images:[{url:'https://fixture.invalid/late.png'}]},usage:{model:'controlled',tapies:0}}
   },
   generateVideo:async()=>{calls++;throw new Error('should not be reached')},
  }
  await assert.rejects(generateStoryboard(shot.id,user.id,{kind:'image',model:'controlled',prompt:'生成'},undefined,undefined,service),/生成期间镜头或引用已更新/)
  assert.equal((await prisma.storyboard.findUniqueOrThrow({where:{id:shot.id}})).imageUrl,shot.imageUrl)
  await assert.rejects(generateStoryboard(shot.id,user.id,{kind:'video',model:'controlled',prompt:'生成'},undefined,undefined,service),/先完成出片前校验/)
  assert.equal(calls,1)
  const cancelledService={...service,generateImage:async()=>({data:{images:[{url:'https://fixture.invalid/cancelled.png'}]},usage:{model:'controlled',tapies:0}})}
  await assert.rejects(generateStoryboard(shot.id,user.id,{kind:'image',model:'controlled',prompt:'生成'},async()=>true,undefined,cancelledService),/任务已停止/)
  const final=await prisma.storyboard.findUniqueOrThrow({where:{id:shot.id}})
  assert.equal(final.imageUrl,shot.imageUrl)
  assert.equal(final.duration,10)
  assert.equal(final.status,'failed')
 }finally{
  await prisma.workspace.delete({where:{id:workspace.id}})
  await prisma.user.delete({where:{id:user.id}})
  await prisma.$disconnect()
 }
})
