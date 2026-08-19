import { normalizePhase23, phase23AssociativeUpdate, validatePhase23 } from './frontend/src/three/architecture/phase23Systems.js';
const wall=(id,a,b,openings=[])=>({id,start:a,end:b,thickness:.2,height:3,baseElevation:0,openings});
const building={id:'phase23-test',name:'Phase 23 Topology Test',levels:[
{index:1,elevation:0,height:3,walls:[wall('A',[0,0],[8,0],[{id:'D1',type:'door',offsetAlongWall:6,width:.9}]),wall('B',[8,0],[8,4]),wall('C',[8,4],[0,4]),wall('D',[0,4],[0,0]),wall('P',[4,0],[4,4],[{id:'D2',type:'door',offsetAlongWall:2,width:.9}])],rooms:[],spaceTopology:{},stairs:[]},
{index:2,elevation:3,height:3,walls:[wall('E',[0,0],[8,0]),wall('F',[8,0],[8,4]),wall('G',[8,4],[0,4]),wall('H',[0,4],[0,0]),wall('Q',[4,0],[4,4])],rooms:[],spaceTopology:{},stairs:[]}
]};
building.levels[0].stairs=[{id:'S1',fromFloor:1,toFloor:2,position:[2,2]}];
normalizePhase23(building);phase23AssociativeUpdate(building,'integration-test');const qa=validatePhase23(building);if(!qa.valid)throw new Error(qa.errors.join('\n'));
const rooms=building.phase23.spaceTopology.rooms,adj=building.phase23.spaceTopology.adjacency,vert=building.phase23.spaceTopology.verticalLinks;
if(rooms.length!==4)throw new Error(`Expected 4 spaces, got ${rooms.length}`);if(adj.length!==1)throw new Error(`Expected 1 door adjacency, got ${adj.length}`);if(vert.length!==1)throw new Error(`Expected 1 vertical link, got ${vert.length}`);
console.log(JSON.stringify({schema:building.metadata.schema,rooms:rooms.length,areas:rooms.map(r=>r.areaM2),adjacency:adj.length,verticalLinks:vert.length,intersections:building.levels[0].spaceTopology.intersections.length,qa},null,2));
