export interface ClientTask {id:string;kind:string;state:string;completed:number;failed:number;total:number|null;currentLabel:string;error?:string|null;result?:unknown;episodeId?:string|null}
export async function waitForTask(id:string,onProgress?:(task:ClientTask)=>void):Promise<ClientTask> {
 for(;;) {
  const res=await fetch(`/api/tasks/${id}`);const data=await res.json()
  if(!res.ok)throw new Error(data.error ?? '读取任务失败')
  const task=data.data as ClientTask;onProgress?.(task)
  if(['succeeded','failed','cancelled'].includes(task.state)) {
   if(task.state!=='succeeded')throw new Error(task.error ?? (task.state==='cancelled'?'任务已停止':`任务失败 ${task.failed} 项`))
   return task
  }
  await new Promise(resolve=>setTimeout(resolve,1000))
 }
}
export async function startTask(input:Record<string,unknown>,onProgress?:(task:ClientTask)=>void) {
 const res=await fetch('/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,idempotencyKey:crypto.randomUUID()})})
 const data=await res.json();if(!res.ok)throw new Error(data.error ?? '创建任务失败')
 onProgress?.(data.data);return waitForTask(data.data.id,onProgress)
}
