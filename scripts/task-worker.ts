import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())
async function main() {
 const {prisma}=await import('../src/lib/prisma')
 const {claimTask,runClaimedTask,recoverInterruptedTasks}=await import('../src/services/tasks/store')
 const {executeTask}=await import('../src/services/tasks/runner')
 const owner=crypto.randomUUID();let stopping=false
 process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true})
 console.log('[tasks] Worker ready')
 while(!stopping) {
  try {await recoverInterruptedTasks();const task=await claimTask(owner);if(task)await runClaimedTask(task,executeTask);else await new Promise(resolve=>setTimeout(resolve,800))}
  catch(error){console.error('[tasks]',error instanceof Error?error.message:'Worker error');await new Promise(resolve=>setTimeout(resolve,2000))}
 }
 await prisma.$disconnect()
}
void main()
