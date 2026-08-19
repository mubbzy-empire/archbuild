import fs from 'node:fs'; import vm from 'node:vm';
const src=fs.readFileSync(new URL('./frontend/src/three/architecture/phase30Systems.js',import.meta.url),'utf8').replace(/export /g,'');
const sandbox={}; vm.createContext(sandbox);
vm.runInContext(src+';globalThis.api={normalizePhase30,runPhase30QA,updatePhase30Issue,validatePhase30,phase30Manifest,PHASE30_SCHEMA};',sandbox);
const building={
  id:'qa-test',
  levels:[{
    index:1,
    walls:[
      {id:'W1',start:[0,0],end:[8,0],thickness:.2,height:3,openings:[{id:'O1',hostWallId:'W1',width:1,offsetAlongWall:3}]},
      {id:'W2',start:[8,0],end:[8,6],thickness:.2,height:3,openings:[]},
      {id:'W3',start:[8,6],end:[0,6],thickness:.2,height:3,openings:[]},
      {id:'W4',start:[0,6],end:[0,0],thickness:.2,height:3,openings:[]}
    ],
    rooms:[{id:'R1',polygon:[[0,0],[8,0],[8,6],[0,6]]}]
  }]
};
const qa=sandbox.api.runPhase30QA(building,{includeInfo:true});
if(!qa.valid) throw new Error('QA should be valid: '+qa.issues.map(x=>x.message).join('; '));
if(qa.summary.warnings!==0) throw new Error('unexpected warnings');
const info=qa.issues.find(x=>x.code==='LEVEL_ROOM_AREA'); if(!info) throw new Error('missing info issue');
sandbox.api.updatePhase30Issue(building,{id:info.id,status:'accepted',note:'Reviewed'});
const v=sandbox.api.validatePhase30(building); if(!v.valid) throw new Error(v.errors.join('; '));
const m=sandbox.api.phase30Manifest(building);
console.log(JSON.stringify({schema:sandbox.api.PHASE30_SCHEMA,status:m.status,issues:m.issues.length,open:m.summary.open,accepted:m.summary.accepted,errors:v.errors.length},null,2));
