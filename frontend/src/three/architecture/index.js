// ---------------------------------------------------------------------------
// index.js — public entry point for the new architecture engine.
//
// Usage (Phase 1, offline/design-brief path):
//
//   import { generateBuildingFromBrief, buildBuildingGroup } from
//     'three/architecture';
//
//   const building = generateBuildingFromBrief({
//     floors: 2, bedrooms: 4, roofType: 'hip',
//     footprint: { width: 12, depth: 10 },
//     features: { garage: true, compoundWall: true },
//   });
//   const { group, report } = buildBuildingGroup(building);
//   scene.add(group);
//   if (report.warnings.length) console.warn(report.warnings);
// ---------------------------------------------------------------------------
export * from './buildingModel.js';
export * from './materialSystem.js';
export * from './openingSystem.js';
export * from './wallSystem.js';
export * from './roofSystem.js';
export * from './stairSystem.js';
export * from './floorSystem.js';
export * from './validation.js';
export * from './geometryBuilder.js';
export * from './designBriefToBuilding.js';

export * from './componentSystem.js';
export * from './mepSystem.js';

export * from './editorOperations.js';
export * from './documentation.js';

export * from './structuralSystem.js';
export * from './drawingGeometry.js';

export * from './professionalGeometry.js';

export * from './bimSystems.js';
export * from './bimData.js';

export * from './phase7Systems.js';
export * from './phase7Geometry.js';
export * from './phase8Systems.js';
export * from './phase8Geometry.js';

export * from './phase10Systems.js';
export * from './phase10Geometry.js';
export * from './phase11Systems.js';
export * from './phase12Systems.js';
export * from './phase12Geometry.js';

export * from './phase21Systems.js';
export * from './phase21Geometry.js';

export * from './phase25Systems.js';
export * from './phase25Geometry.js';

export * from './phase30Systems.js';
export * from './phase31Systems.js';
export * from './phase32Systems.js';

export * from './phase33Systems.js';
export * from './phase34Systems.js';
export * from './phase35Systems.js';
export * from './phase36Systems.js';
export * from './phase37Systems.js';
export * from './phase38Systems.js';
