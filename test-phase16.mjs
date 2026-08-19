import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { normalizePhase16, offsetWall, trimWallTo, extendWallTo, joinWalls, regeneratePhase16, validatePhase16 } from './frontend/src/three/architecture/phase16Systems.js';

const building = generateBuildingFromBrief({name:'Phase 16 Test House',floors:1,floorHeight:3,footprint:{width:12,depth:10},bedrooms:3,bathrooms:2,roofType:'hip',style:'modern',features:{garage:false,balcony:false,porch:false},systems:{}});
normalizePhase16(building);
const level = building.levels[0];
const a = level.walls[0];
const b = level.walls[1];
const original = {start:[...a.start],end:[...a.end]};
offsetWall(building,{levelIndex:level.index,wallId:a.id,distance:0.2,side:1});
if (a.start[0] === original.start[0] && a.start[1] === original.start[1]) throw new Error('Offset did not move wall');
// Add a perpendicular target line through the selected wall's path for trim/extend coverage.
const testWall = {id:'target-test',start:[a.start[0]+2,-20],end:[a.start[0]+2,20],thickness:0.2,height:3,openings:[]};
level.walls.push(testWall);
const beforeTrim = [...a.end];
const trimHit = trimWallTo(building,{levelIndex:level.index,wallId:a.id,targetWallId:testWall.id,keep:'start'});
if (!trimHit) throw new Error('Trim did not find target intersection');
if (a.end[0] === beforeTrim[0] && a.end[1] === beforeTrim[1]) throw new Error('Trim did not change wall');
const extendHit = extendWallTo(building,{levelIndex:level.index,wallId:a.id,targetWallId:testWall.id,which:'end'});
if (!extendHit) throw new Error('Extend did not find target intersection');
joinWalls(building,{levelIndex:level.index,tolerance:0.15});
regeneratePhase16(building,{reason:'phase16 integration test',changedRefs:[{kind:'wall',id:a.id,level:level.index}]});
const qa = validatePhase16(building);
console.log(JSON.stringify({schema:building.phase16.schema,operations:building.phase16.authoring.operationCount,offsetMoved:true,trimmed:true,extended:true,affected:building.phase16.associative.affected.length,qa},null,2));
if(!qa.valid) process.exit(1);
