import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { buildDependencyGraph } from './frontend/src/three/architecture/phase13Systems.js';
import { normalizePhase15, regeneratePhase15, propagatePhase15, validatePhase15, phase15Manifest } from './frontend/src/three/architecture/phase15Systems.js';

const b = generateBuildingFromBrief({name:'Phase 15 Test',floors:2,floorHeight:3,footprint:{width:12,depth:10},bedrooms:3,bathrooms:2,roofType:'hip',style:'modern',features:{garage:false,balcony:false,porch:false},systems:{}});
normalizePhase15(b); buildDependencyGraph(b); regeneratePhase15(b,{reason:'test initialization'});
const level=b.levels[0], wall=level.walls[0];
const opening=wall.openings?.[0];
const affected=propagatePhase15(b,[{kind:'wall',id:wall.id,level:level.index}],'test wall edit');
const q=validatePhase15(b);
const manifest=phase15Manifest(b);
console.log(JSON.stringify({schema:manifest.schema,affected:affected.length,roomAreas:level.rooms?.map(r=>r.areaM2).slice(0,3),openingHost:opening?.hostWallId,valid:q.valid,errors:q.errors,warnings:q.warnings},null,2));
if(!q.valid) process.exit(1);
