import { normalizePhase22, phase22AssociativeUpdate, validatePhase22 } from './frontend/src/three/architecture/phase22Systems.js';
const building={id:'phase22-test',name:'Phase 22 House',levels:[{index:1,elevation:0,height:3,walls:[
{id:'W1',start:[0,0],end:[6,0],thickness:.2,height:3,baseElevation:0,openings:[{id:'D1',type:'door',width:0.9,height:2.1,offsetAlongWall:3}]},
{id:'W2',start:[6,0],end:[6,4],thickness:.2,height:3,baseElevation:0,openings:[]},
{id:'W3',start:[6,4],end:[0,4],thickness:.2,height:3,baseElevation:0,openings:[]},
{id:'W4',start:[0,4],end:[0,0],thickness:.2,height:3,baseElevation:0,openings:[]}
],rooms:[]} ]};
normalizePhase22(building); phase22AssociativeUpdate(building,'test'); const qa=validatePhase22(building);
if(!qa.valid) throw new Error(qa.errors.join('\n'));
if(building.levels[0].rooms.length!==1) throw new Error(`Expected 1 room, got ${building.levels[0].rooms.length}`);
if(Math.abs(building.levels[0].rooms[0].areaM2-24)>0.01) throw new Error('Room area incorrect');
console.log(JSON.stringify({schema:building.metadata.schema,rooms:building.phase22.spaceTopology.rooms.length,area:building.levels[0].rooms[0].areaM2,ownership:building.phase22.spaceTopology.wallOwnership.length,adjacency:building.phase22.spaceTopology.adjacency.length,qa},null,2));
