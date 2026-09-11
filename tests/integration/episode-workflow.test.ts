import assert from 'node:assert/strict'
import { test } from 'node:test'
import { episodeStage, groupShots } from '../../src/lib/workflow/episode-state'
test('补齐全剧资产只推进未拆分集，不回退已有视频集', () => {
  assert.equal(episodeStage({status:'outlined', productionStage:'outline', storyboardCount:0, videoCount:0}, false), 'outlining')
  assert.equal(episodeStage({status:'outlined', productionStage:'outline', storyboardCount:0, videoCount:0}, true), 'storyboarding')
  assert.equal(episodeStage({status:'video_ready', productionStage:'video', storyboardCount:3, videoCount:3}, true), 'video')
})
test('同名不连续镜组独立，空标题每六镜分组', () => {
  const rows = Array.from({length:7}, (_,i) => ({id:String(i),segmentTitle:null}))
  assert.deepEqual(groupShots(rows).map(g=>g.items.length), [6,1])
  const named=[{id:'a',segmentTitle:'同名'},{id:'b',segmentTitle:'另段'},{id:'c',segmentTitle:'同名'}]
  assert.deepEqual(groupShots(named).map(g=>g.id), ['a','b','c'])
})
