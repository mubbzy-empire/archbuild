import fs from 'node:fs';
import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { normalizePhase14, editWallGrip, moveOpeningAlongWall, syncPhase14, validatePhase14, phase14Manifest } from './frontend/src/three/architecture/phase14Systems.js';
const b=generateBuildingFromBrief({name:'Phase 14 Test',floors:2,floorHeight:3,footprint:{width:12,depth:10},bedrooms:3,bathrooms:2,roofType:'hip',style:'modern',features:{}});
normalizePhase14(b); const l=b.levels[0]; const w=l.walls[0];
const before=[...w.start]; editWallGrip(b,{levelIndex:0,wallId:w.id,grip:'end',point:[w.end[0]+1,w.end[1]],snapStep:.1});
const o=w.openings?.[0]; if(o) moveOpeningAlongWall(b,{levelIndex:0,wallId:w.id,openingId:o.id,offsetAlongWall:o.offsetAlongWall+.2});
syncPhase14(b,'test'); const q=validatePhase14(b); const m=phase14Manifest(b); fs.writeFileSync('/tmp/phase14-test-output.json',JSON.stringify({before,wStart:w.start,valid:q.valid,errors:q.errors,warnings:q.warnings,schema:m.schema},null,2)); if(!q.valid) process.exit(1); console.log(JSON.stringify({valid:q.valid,schema:m.schema,edited:w.start[0]!==before[0],edits:b.phase14.authoring.editCount}));
