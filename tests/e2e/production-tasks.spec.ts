import { test, expect, type APIRequestContext } from '@playwright/test'
import { login } from './helpers'
import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
loadEnvConfig(process.cwd())
const db=new PrismaClient()
async function finished(request:APIRequestContext,id:string) {
 let task:any
 await expect.poll(async()=>{
  const response=await request.get(`/api/tasks/${id}`)
  expect(response.ok()).toBeTruthy()
  task=(await response.json()).data
  return task.state
 },{timeout:60000,intervals:[500]}).toMatch(/succeeded|failed|cancelled/)
 expect(task.state,JSON.stringify(task)).toBe('succeeded')
 return task
}
test('真实任务闭环：拆分不自动生图、校验门槛、视频空框与分集阶段刷新、只重试过期视频',async({page})=>{
 test.setTimeout(120000)
 await login(page)
 const user=await db.user.findUniqueOrThrow({where:{email:'demo@wanmusheng.com'}})
 const member=await db.workspaceMember.findFirstOrThrow({where:{userId:user.id}})
 const script=await db.script.create({data:{workspaceId:member.workspaceId,title:'任务闭环验收',content:'小雨从家中出发，在街口遇到朋友。朋友递给她一封信，她打开信封，决定出发寻找父亲。',status:'assets',targetAspect:'16:9',episodes:{create:[{number:1,title:'出发',content:'小雨推门走出家门。朋友递过信封，小雨打开阅读。'},{number:2,title:'待创作',content:'小雨到车站候车。'}]}}})
 try {
  const eps=await db.episode.findMany({where:{scriptId:script.id},orderBy:{number:'asc'}})
  const episodeId=eps[0].id
  const body={kind:'split',scriptId:script.id,episodeId,body:{mode:'text',model:'auto'},idempotencyKey:crypto.randomUUID()}
  const created=await page.request.post('/api/tasks',{data:body})
  expect(created.status()).toBe(202)
  const task=(await created.json()).data
  expect((await page.request.post('/api/tasks',{data:body})).status()).toBe(202)
  await finished(page.request,task.id)
  let shots=await db.storyboard.findMany({where:{episodeId},orderBy:{number:'asc'}})
  expect(shots.length).toBeGreaterThan(0)
  expect(shots.every(s=>s.imageUrl===null&&s.videoUrl===null&&s.segmentId)).toBeTruthy()
  expect((await page.request.post(`/api/storyboards/${shots[0].id}/generate`,{data:{kind:'video',model:'auto',prompt:'生成'}})).status()).toBe(409)
  const validate=await page.request.post(`/api/scripts/${script.id}/episodes/${episodeId}/validate`,{data:{model:'auto'}})
  expect(validate.ok(),await validate.text()).toBeTruthy()
  expect((await page.request.post(`/api/scripts/${script.id}/episodes/${episodeId}/stage`)).ok()).toBeTruthy()
  await page.goto(`/creation/film-factory/${script.id}`)
  await expect(page.getByRole('button',{name:'批量生成视频',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'生成视频',exact:true}).first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button',{name:'批量生成视频',exact:true})).toBeVisible()
  expect((await db.episode.findUniqueOrThrow({where:{id:eps[1].id}})).productionStage).toBe('outline')
  await db.storyboard.updateMany({where:{episodeId,id:{not:shots[0].id}},data:{videoUrl:'https://fixture.invalid/already.mp4'}})
  const video=await page.request.post('/api/tasks',{data:{...body,kind:'video_batch',body:{model:'auto',aspectRatio:'16:9'},idempotencyKey:crypto.randomUUID()}})
  expect(video.status()).toBe(202)
  const completed=await finished(page.request,(await video.json()).data.id)
  expect(completed.completed).toBe(1)
  shots=await db.storyboard.findMany({where:{episodeId},orderBy:{number:'asc'}})
  expect(shots[0].videoUrl).toBeTruthy()
  await db.storyboard.update({where:{id:shots[0].id},data:{generationParams:{...(shots[0].generationParams as any),videoStale:true,outputsStale:true}}})
  const retry=await page.request.post('/api/tasks',{data:{...body,kind:'video_batch',body:{model:'auto',aspectRatio:'16:9'},idempotencyKey:crypto.randomUUID()}})
  expect(retry.status()).toBe(202)
  expect((await finished(page.request,(await retry.json()).data.id)).completed).toBe(1)
 } finally {
  const episodes=await db.episode.findMany({where:{scriptId:script.id},select:{id:true}})
  await db.generationTask.deleteMany({where:{episodeId:{in:episodes.map(e=>e.id)}}})
  await db.script.delete({where:{id:script.id}})
 }
})
test.afterAll(async()=>{await db.$disconnect()})
