import { createBuilding, createLevel, createWall, createRoom, createStair } from './frontend/src/three/architecture/buildingModel.js';
import { normalizePhase12, regeneratePhase12Associativity, phase12Coordination, validatePhase12, phase12Manifest } from './frontend/src/three/architecture/phase12Systems.js';
const walls=[
 createWall({id:'w1',start:[0,0],end:[8,0],type:'exterior',openings:[{id:'d1',type:'door',offsetAlongWall:3,width:1,height:2.1}]}),
 createWall({id:'w2',start:[8,0],end:[8,6],type:'exterior',openings:[{id:'win1',type:'window',offsetAlongWall:2,width:1.4,height:1.2}]}),
 createWall({id:'w3',start:[8,6],end:[0,6],type:'exterior'}),
 createWall({id:'w4',start:[0,6],end:[0,0],type:'exterior'}),
];
const level=createLevel({id:'l1',index:1,elevation:0,height:3,footprint:[[0,0],[8,0],[8,6],[0,6]],walls,rooms:[createRoom({id:'r1',name:'Living',floor:1,polygon:[[0,0],[8,0],[8,6],[0,6]]})]});
const b=createBuilding({id:'test12',name:'Phase 12 House',levels:[level],stairs:[createStair({id:'s1',fromFloor:1,toFloor:2,type:'straight',position:[4,2]})],systems:{plumbing:{routes:[{id:'p1',type:'supply',points:[[1,1,0],[1,1.2,1],[1,1.2,2]]}]}}});
b.levels.push(createLevel({id:'l2',index:2,elevation:3,height:3,footprint:level.footprint,walls:walls.map(w=>({...w,id:w.id+'-2',start:[w.start[0],w.start[1]],end:[w.end[0],w.end[1]],openings:[]})),rooms:[]}));
normalizePhase12(b); regeneratePhase12Associativity(b,'test'); phase12Coordination(b); const q=validatePhase12(b); const m=phase12Manifest(b);
console.log(JSON.stringify({valid:q.valid,errors:q.errors,warnings:q.warnings,counts:m.counts, schema:m.schema},null,2));
