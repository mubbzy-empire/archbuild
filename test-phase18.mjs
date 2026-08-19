import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { normalizePhase18, apply3DTransform, setPhase18TransformMode, setPhase18ConstructionView, validatePhase18, phase18Manifest, PHASE18_SCHEMA } from './frontend/src/three/architecture/phase18Systems.js';

const building = generateBuildingFromBrief({name:'Phase 18 Test House',floors:2,floorHeight:3,footprint:{width:12,depth:10},bedrooms:4,bathrooms:3,roofType:'hip',style:'modern',features:{garage:true,balcony:true,porch:true},systems:{}});
normalizePhase18(building);
const level=building.levels[0];
const wall=level.walls[0];
const before=[...wall.start];
apply3DTransform(building,{kind:'wall',id:wall.id,levelIndex:level.index,delta:[0.5,0,0.25]});
if(Math.abs(wall.start[0]-before[0]-0.5)>1e-9 || Math.abs(wall.start[1]-before[1]-0.25)>1e-9) throw new Error('Wall 3D translation failed');
const component=level.components?.[0];
if(component){ const p=[...component.position]; apply3DTransform(building,{kind:'component',id:component.id,levelIndex:level.index,delta:[0.2,0,0.3],rotationDelta:Math.PI/4}); if(Math.abs(component.position[0]-p[0]-.2)>1e-9) throw new Error('Component 3D translation failed'); }
setPhase18TransformMode(building,'rotate'); setPhase18ConstructionView(building,'construction');
const q=validatePhase18(building); if(!q.valid) throw new Error(JSON.stringify(q));
const m=phase18Manifest(building); if(m.schema!==PHASE18_SCHEMA) throw new Error('Schema mismatch');
console.log(JSON.stringify({schema:m.schema,operations:m.authoring.operations,wallLayerSolids:m.threeD.wallLayerSolids,openingDetails:m.threeD.openingDetails,qa:q}));
