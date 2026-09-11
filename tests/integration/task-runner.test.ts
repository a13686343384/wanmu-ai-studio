import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/prisma'
import { enqueueTask, claimTask, cancelTask, taskCancelled, runClaimedTask, taskProgress } from '../../src/services/tasks/store'
test('幂等、并发领取、取消不运行后续条目、失败不报成功', async()=>{
 const prefix=crypto.randomUUID();const workspaceId=prefix,userId=prefix
 const a=await enqueueTask({workspaceId,userId,kind:'test',payload:{},idempotencyKey:prefix})
 try {
  assert.equal((await enqueueTask({workspaceId,userId,kind:'test',payload:{},idempotencyKey:prefix})).id,a.id)
  const claims=await Promise.all([claimTask('a',workspaceId),claimTask('b',workspaceId)]);assert.equal(claims.filter(Boolean).length,1)
  const task=claims.find(Boolean)!; let executed=0
  await runClaimedTask(task,async()=>{
   for(let i=0;i<3;i++) {if(await taskCancelled(task.id))break; executed++;await taskProgress(task.id,executed,0,3,'完成第一项');await cancelTask(task.id)}
   return {executed}
  })
  assert.equal(executed,1);assert.equal((await prisma.generationTask.findUniqueOrThrow({where:{id:a.id}})).state,'cancelled')
  const b=await enqueueTask({workspaceId,userId,kind:'test',payload:{},idempotencyKey:prefix+'b'})
  const second=await claimTask('a',workspaceId);assert.ok(second)
  await runClaimedTask(second,async()=>{throw new Error('上游失败')})
  assert.equal((await prisma.generationTask.findUniqueOrThrow({where:{id:b.id}})).state,'failed')
 } finally {await prisma.generationTask.deleteMany({where:{workspaceId}});await prisma.$disconnect()}
})
