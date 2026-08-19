import assert from 'node:assert/strict';
import { normalizePhase19, normalizePhase19Associativity, setOpeningFamily, setWallFaceOffsets, validatePhase19, phase19Manifest, PHASE19_SCHEMA } from './frontend/src/three/architecture/phase19Systems.js';

const b={id:'P19',name:'Phase 19 Test',levels:[{index:1,elevation:0,height:3,walls:[{id:'W1',floor:1,start:[0,0],end:[8,0],thickness:.2,height:3,type:'exterior',openings:[{id:'D1',type:'door',offsetAlongWall:2,width:.9,height:2.1,sillHeight:0}]}],rooms:[],components:[]} ]};
normalizePhase19(b); normalizePhase19Associativity(b);
setOpeningFamily(b,{levelIndex:1,id:'D1',family:'double'});
setWallFaceOffsets(b,{levelIndex:1,wallId:'W1',exterior:.015,interior:.01});
normalizePhase19Associativity(b);
const report=validatePhase19(b); assert(report.valid, JSON.stringify(report));
const m=phase19Manifest(b); assert.equal(m.schema,PHASE19_SCHEMA); assert.equal(b.levels[0].walls[0].openings[0].family,'double'); assert.equal(b.levels[0].walls[0].openings[0].hostWallId,'W1');
console.log(JSON.stringify({schema:m.schema,doors:m.families.doors,windows:m.families.windows,operations:m.authoring.operations,wallFace:b.levels[0].walls[0].faceGeometry,errors:report.errors.length,warnings:report.warnings.length},null,2));
