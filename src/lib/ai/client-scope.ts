/** Context shared by model menus and generation requests. Never grants server authorization. */
export function currentModelScope(pathname?:string): {workspaceId?:string;scriptId?:string;projectId?:string;writingProjectId?:string} {
 if(typeof window==='undefined')return {}
 const path=pathname??window.location.pathname
 const script=path.match(/^\/creation\/film-factory\/([^/]+)$/)?.[1]
 if(script && script!=='new')return {scriptId:decodeURIComponent(script)}
 const project=path.match(/^\/canvas\/([^/]+)$/)?.[1]
 if(project && !['new','team'].includes(project))return {projectId:decodeURIComponent(project)}
 const writing=path.match(/^\/creation\/script-writing\/([^/]+)$/)?.[1]
 if(writing && writing!=='new')return {writingProjectId:decodeURIComponent(writing)}
 try {const workspaceId=localStorage.getItem('wanmusheng:active-workspace');return workspaceId?{workspaceId}:{}}catch{return {}}
}
