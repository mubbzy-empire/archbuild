import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { wallLength } from './frontend/src/three/architecture/buildingModel.js';
import { normalizePhase20, editWallFace, moveWallFace, resizeOpening, moveOpening3D, validatePhase20, phase20Manifest, PHASE20_SCHEMA } from './frontend/src/three/architecture/phase20Systems.js';
const b=generateBuildingFromBrief({name:'Phase 20 Test',floors:2,floorHeight:3,footprint:{width:12,depth:10},bedrooms:3,bathrooms:2,roofType:'hip',style:'modern',features:{garage:true}});
normalizePhase20(b);
const l=b.levels[0]; const w=l.walls[0]; const oldT=w.thickness; const oldLen=wallLength(w);
editWallFace(b,{levelIndex:l.index,wallId:w.id,face:'exterior',thickness:oldT+0.04});
moveWallFace(b,{levelIndex:l.index,wallId:w.id,face:'interior',distance:0.03});
const o=w.openings?.[0]; if(o){ resizeOpening(b,{levelIndex:l.index,openingId:o.id,width:Math.max(.6,o.width-.1),height:o.height}); moveOpening3D(b,{levelIndex:l.index,openingId:o.id,offsetAlongWall:o.offsetAlongWall+.2}); }
const q=validatePhase20(b); const manifest=phase20Manifest(b);
const out={schema:PHASE20_SCHEMA,valid:q.valid,errors:q.errors,warnings:q.warnings,operations:b.phase20.authoring.operations,history:b.phase20.history.length,wallLengthBefore:oldLen,wallLengthAfter:wallLength(w),wallThickness:w.thickness,manifestSchema:manifest.schema};
console.log(JSON.stringify(out,null,2));
if(!q.valid) process.exit(1);
