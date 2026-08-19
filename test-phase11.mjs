import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { normalizePhase10, deriveStructuralGrid, deriveFoundationSchedule, deriveRoofConstruction, deriveCeilingSystems, deriveConstructionAssemblies, deriveMepCoordination, deriveIfcData } from './frontend/src/three/architecture/phase10Systems.js';
import { normalizePhase11, phase11ModelIndex, queryModel, runCoordinationClashCheck, buildIfc4Step, validatePhase11, PHASE11_SCHEMA } from './frontend/src/three/architecture/phase11Systems.js';

const b=generateBuildingFromBrief({name:'Phase 11 Test House',floors:2,bedrooms:4,bathrooms:3,footprint:{width:12,depth:10},roofType:'hip'});
normalizePhase10(b); deriveStructuralGrid(b); deriveFoundationSchedule(b); deriveRoofConstruction(b); deriveCeilingSystems(b); deriveConstructionAssemblies(b); deriveMepCoordination(b); deriveIfcData(b);
normalizePhase11(b); const index=phase11ModelIndex(b); const walls=queryModel(b,{type:'wall'}); const spaces=queryModel(b,{class:'IfcSpace'}); const coordination=runCoordinationClashCheck(b); const ifc=buildIfc4Step(b); const qa=validatePhase11(b);
if(!index.length || !walls.count || !spaces.count || !ifc.startsWith('ISO-10303-21;') || !ifc.includes("FILE_SCHEMA(('IFC4'))") || !ifc.endsWith('END-ISO-10303-21;\n') || !qa.valid) throw new Error(JSON.stringify({index:index.length,walls,spaces,qa}));
console.log(JSON.stringify({schema:PHASE11_SCHEMA,indexed:index.length,walls:walls.count,spaces:spaces.count,clashes:coordination.clashes.length,ifcBytes:Buffer.byteLength(ifc),qa},null,2));
