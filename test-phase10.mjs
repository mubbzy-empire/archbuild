import { generateBuildingFromBrief } from './frontend/src/three/architecture/designBriefToBuilding.js';
import { normalizePhase10, deriveStructuralGrid, deriveFoundationSchedule, deriveRoofConstruction, deriveCeilingSystems, deriveConstructionAssemblies, deriveMepCoordination, deriveIfcData, phase10Manifest, validatePhase10 } from './frontend/src/three/architecture/phase10Systems.js';
const building = generateBuildingFromBrief({ floors: 2, bedrooms: 3, footprint: { width: 12, depth: 10 }, roofType: 'hip' });
normalizePhase10(building); deriveStructuralGrid(building); deriveFoundationSchedule(building); deriveRoofConstruction(building); deriveCeilingSystems(building); deriveConstructionAssemblies(building); deriveMepCoordination(building); deriveIfcData(building);
const qa = validatePhase10(building); if (!qa.valid) throw new Error(JSON.stringify(qa));
const manifest = phase10Manifest(building);
console.log(JSON.stringify({ schema: manifest.schema, levels: building.levels.length, structuralGrid: [building.structural.grid.x.length, building.structural.grid.z.length], foundations: building.structural.foundations.length, roofPlanes: building.roof.planes.length, ceilings: building.ceilingSystems.length, mepRoutes: Object.values(building.systems).reduce((n,s)=>n+(s.routes||[]).length,0), ifcElements: building.documentation.ifc.elements.length, qa }, null, 2));
