import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { regeneratePhase9Documentation, validatePhase9, phase9Manifest, PHASE9_SCHEMA } from './frontend/src/three/architecture/phase9Systems.js';
const b=generateBuildingFromBrief({name:'Phase 9 Test',floors:2,floorHeight:3,footprint:{width:12,depth:10},bedrooms:4,bathrooms:3,roofType:'hip',style:'modern',features:{garage:true}});
regeneratePhase9Documentation(b);
const q=validatePhase9(b); const m=phase9Manifest(b);
console.log(JSON.stringify({schema:m.schema,valid:q.valid,errors:q.errors,warnings:q.warnings,layers:b.documentation.drafting.layers.length,views:b.documentation.views.length,sheets:b.documentation.sheets.length,dimensions:b.documentation.drafting.dimensions.length,annotations:b.documentation.drafting.annotations.length,markers:b.documentation.drafting.sectionMarkers.length},null,2));
if(m.schema!==PHASE9_SCHEMA || !q.valid) process.exit(1);
