interface EpisodeFacts { status: string; productionStage?: string; storyboardCount: number; videoCount: number }
/** Each episode keeps its own completed work; global asset readiness only unlocks unsplit episodes. */
export function episodeStage(episode: EpisodeFacts, assetsReady: boolean): string {
  if (episode.status === 'completed') return 'completed'
  if (episode.productionStage === 'post') return 'post_production'
  if (episode.productionStage === 'video' || episode.videoCount > 0) return 'video'
  if (episode.storyboardCount > 0 || episode.status === 'storyboarded' || assetsReady) return 'storyboarding'
  return 'outlining'
}
export function groupShots<T extends {id: string; segmentTitle?: string | null; segmentId?: string | null}>(items:T[]) {
  const groups: {id:string;title:string;items:T[]}[]=[]
  for (const item of items) {
    const title=item.segmentTitle?.trim()
    const previous=groups.at(-1)
    const same=previous && (item.segmentId ? previous.id===item.segmentId : title ? previous.title===title : !previous.items[0]?.segmentTitle && previous.items.length<6)
    if(same) previous.items.push(item)
    else groups.push({id:item.segmentId ?? item.id,title:title || `B${String(groups.length+1).padStart(2,'0')}·镜组`,items:[item]})
  }
  return groups
}
