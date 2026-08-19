import { createBuilding, createLevel, createWall, addOpening, createRoom } from './frontend/src/three/architecture/buildingModel.js';
import { ensureParametricData, deriveAssociativeDimensions, deriveModelTags, deriveLevelAndGridDatums, wallAssemblySchedule, validatePhase6, phase6Manifest } from './frontend/src/three/architecture/phase6Systems.js';
const level=createLevel({index:1,elevation:0,height:3,footprint:[[-5,-4],[5,-4],[5,4],[-5,4]],walls:[]});
const w1=createWall({start:[-5,-4],end:[5,-4],height:3,thickness:.2}); addOpening(w1,{type:'door',offsetAlongWall:5,width:1,height:2.1});
const w2=createWall({start:[5,-4],end:[5,4],height:3,thickness:.2}); const w3=createWall({start:[5,4],end:[-5,4],height:3,thickness:.2}); const w4=createWall({start:[-5,4],end:[-5,-4],height:3,thickness:.2});
level.walls=[w1,w2,w3,w4]; level.rooms=[createRoom({name:'Living',type:'living',floor:1,polygon:[[-4.8,-3.8],[4.8,-3.8],[4.8,3.8],[-4.8,3.8]],ceilingHeight:3})];
const b=createBuilding({name:'Phase 6 Test',levels:[level],site:{boundary:[[-8,-7],[8,-7],[8,7],[-8,7]]}});
ensureParametricData(b); deriveAssociativeDimensions(b); deriveModelTags(b); deriveLevelAndGridDatums(b);
console.log({dims:b.documentation.dimensions.length,tags:b.documentation.tags.length,grids:b.datums.grids.length,assemblies:wallAssemblySchedule(b).length,qa:validatePhase6(b),schema:phase6Manifest(b).schema});
