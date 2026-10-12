import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PROJECT_FIELDS,PROJECT_DECISIONS,projectCompleteness,projectMissing,projectDecisionReadiness,projectDecisionChecklist,mergeProjectExtraction,projectChatPrompts} from '../../src/server/diagnosis/project_diagnosis.js';

test('six required decisions and ten existing context fields',()=>{
 assert.equal(PROJECT_FIELDS.length,16);assert.equal(PROJECT_DECISIONS.length,6);
 assert.equal(projectCompleteness({}),0);assert.equal(projectMissing({}).length,16);
});
test('placeholder strings do not mean requirements are complete',()=>{
 const x={projectOverview:'项目存在',scopeInventory:'有地图',deliverables:'无',timelineAndPeople:'无',budgetAndCooperation:'待定'};
 assert.equal(projectCompleteness(x),13);assert.equal(projectMissing(x).length,14);
});
test('unverified or missing quote cannot mark mandatory decision confirmed',()=>{
 const a=mergeProjectExtraction({}, {facts:{deliveryBoundary:'只交付工具'}, evidence:{deliveryBoundary:{status:'confirmed',quote:'不存在的客户原话'}}},'只交付工具');
 assert.equal(projectDecisionReadiness(a).confirmed,0);
 assert.equal(projectDecisionChecklist(a)[0].status,'partial');
});
test('partial decision must still be followed up',()=>{
 const a=mergeProjectExtraction({}, {facts:{deliveryBoundary:'交付工具，后续修复责任未定'},evidence:{deliveryBoundary:{status:'partial',quote:'交付工具'}}},'交付工具');
 assert.equal(projectDecisionChecklist(a)[0].status,'partial');
 assert.match(projectChatPrompts(a,[]).userPrompt,/工具运行后的修复/);
});
test('verbatim customer evidence validates only the actual decision',()=>{
 const utterance='交付工具，但不负责客户的全游戏迁移，后续由客户自行调试';
 const a=mergeProjectExtraction({}, {facts:{deliveryBoundary:utterance,acceptanceOwnership:'全通过'},evidence:{deliveryBoundary:{status:'confirmed',quote:'不负责客户的全游戏迁移'},acceptanceOwnership:{status:'confirmed',quote:'没有的语句'}}},utterance);
 assert.equal(projectDecisionReadiness(a).confirmed,1);assert.equal(projectCompleteness(a),6);
});
test('historical profile with 无 placeholders is not 100% done',()=>{
 const old={projectOverview:'已有游戏',objectives:'迁移和换皮',currentArchitecture:'完整说明书',scopeInventory:'有客户端和脚本',assetsAndRights:'合法授权',migrationCompatibility:'字段差异',deliverables:'无',timelineAndPeople:'无',budgetAndCooperation:'无',riskAndValidation:'未做回档'};
 assert.equal(projectCompleteness(old),44);assert.equal(projectDecisionReadiness(old).confirmed,0);
});
test('all six decisions can be separately confirmed by quoted answers',()=>{
 let facts={};
 for(const [key] of PROJECT_DECISIONS){const msg='我确认'+key+'由团队确认并签字';facts=mergeProjectExtraction(facts,{facts:{[key]:msg},evidence:{[key]:{status:'confirmed',quote:msg}}},msg);}
 assert.equal(projectDecisionReadiness(facts).confirmed,6);assert.equal(projectCompleteness(facts),38);
});
