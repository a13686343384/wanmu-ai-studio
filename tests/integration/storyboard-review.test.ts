import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseReview, canGenerate } from '../../src/lib/validations/storyboard-review'
test('校验不能引用其他集镜头', () => {
 assert.throws(()=>parseReview({issues:[{id:'i',severity:'blocking',storyboardIds:['outside'],reason:'缺场景',action:'attachScene'}]},['a']))
})
test('过期报告与blocking阻止生成，建议需要确认', () => {
 assert.equal(canGenerate(null,'v2'),false)
 assert.equal(canGenerate({inputRevision:'v1',issues:[],advisoriesAcknowledged:true},'v2'),false)
 assert.equal(canGenerate({inputRevision:'v2',issues:[{severity:'blocking'}],advisoriesAcknowledged:true},'v2'),false)
 assert.equal(canGenerate({inputRevision:'v2',issues:[{severity:'advisory'}],advisoriesAcknowledged:false},'v2'),false)
 assert.equal(canGenerate({inputRevision:'v2',issues:[],advisoriesAcknowledged:false},'v2'),true)
})
