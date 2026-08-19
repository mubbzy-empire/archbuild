// ---------------------------------------------------------------------------
// geometryBuilder.js
//
// The single entry point that turns a Building IR into a real Three.js
// scene graph. This is what Chat→3D, Blueprint→3D and Estate→3D should all
// call once they each produce a Building via their own path (design brief,
// vision pipeline, or site/estate layout) — one geometry engine behind all
// three routes, per the master spec.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { normalizeBuilding, topLevel } from './buildingModel.js';
import { validateBuilding, autoRepairBuilding } from './validation.js';
import { buildLevelWalls } from './wallSystem.js';
import { buildSlabMesh, buildRoomFloorAndCeiling } from './floorSystem.js';
import { buildStairGroup } from './stairSystem.js';
import { buildRoofGroup } from './roofSystem.js';
import { buildLevelComponents } from './componentSystem.js';
import { buildMepGroup } from './mepSystem.js';
import { buildStructuralGroup } from './structuralSystem.js';
import { solveWallNetwork } from './professionalGeometry.js';
import { solveProfessionalWallJoins, normalizeOpeningFamilies, buildTiedFoundationGroup, buildCeilingSystemGroup, buildSiteCoordinationGroup, buildDisciplineRouteGroup } from './bimSystems.js';
import { normalizeBimIdentity } from './bimData.js';
import { ensureParametricData, deriveAssociativeDimensions, deriveModelTags, deriveLevelAndGridDatums, validatePhase6 } from './phase6Systems.js';
import { phase7ProductionData, validatePhase7 } from './phase7Systems.js';
import { buildPhase7ProductionGroup } from './phase7Geometry.js';
import { normalizePhase8Data, regenerateDocumentation, validatePhase8 } from './phase8Systems.js';
import { buildPhase8ProductionGroup } from './phase8Geometry.js';
import { normalizePhase10, deriveStructuralGrid, deriveFoundationSchedule, deriveRoofConstruction, deriveCeilingSystems, deriveConstructionAssemblies, deriveMepCoordination, deriveIfcData, validatePhase10 } from './phase10Systems.js';
import { buildAdvancedFoundationGroup, buildAdvancedRoofGroup, buildAdvancedCeilingGroup, buildStructuralGridGroup, buildDetailedMepGroup } from './phase10Geometry.js';
import { normalizePhase12, regeneratePhase12Associativity, phase12Coordination, validatePhase12 } from './phase12Systems.js';
import { buildPhase12ConstructionGroup } from './phase12Geometry.js';
import { normalizePhase16, regeneratePhase16, validatePhase16 } from './phase16Systems.js';
import { normalizePhase18, validatePhase18 } from './phase18Systems.js';
import { buildPhase18ConstructionGroup } from './phase18Geometry.js';
import { normalizePhase19, normalizePhase19Associativity, validatePhase19 } from './phase19Systems.js';
import { buildPhase19ComponentDetailGroup, buildPhase19WallFaceGuides } from './phase19Geometry.js';
import { normalizePhase20, validatePhase20 } from './phase20Systems.js';
import { buildPhase20AuthoringHandles } from './phase20Geometry.js';
import { normalizePhase21, validatePhase21 } from './phase21Systems.js';
import { buildPhase21LayeredWallGroup, buildPhase21FaceHandles } from './phase21Geometry.js';
import { normalizePhase22, phase22AssociativeUpdate, validatePhase22 } from './phase22Systems.js';
import { buildPhase22SpaceTopologyGroup } from './phase22Geometry.js';
import { normalizePhase24, regeneratePhase24, validatePhase24 } from './phase24Systems.js';
import { buildPhase24ConstructionGroup } from './phase24Geometry.js';
import { normalizePhase25, regeneratePhase25, validatePhase25 } from './phase25Systems.js';
import { buildPhase25MepGroup } from './phase25Geometry.js';
import { normalizePhase29, validatePhase29 } from './phase29Systems.js';
import { normalizePhase30, validatePhase30 } from './phase30Systems.js';
import { normalizePhase31, validatePhase31 } from './phase31Systems.js';
import { normalizePhase32, generatePhase32Documentation, validatePhase32 } from './phase32Systems.js';
import { normalizePhase33, generatePhase33ExportManifest, validatePhase33 } from './phase33Systems.js';
import { normalizePhase34, generatePhase34Package, validatePhase34 } from './phase34Systems.js';

// Returns { group, report } — group is ready to add to a scene, report is
// the validation result (post-repair) so the caller/UI can surface
// warnings without blocking render.
export function buildBuildingGroup(rawBuilding) {
  let building = normalizeBuilding(rawBuilding);
  normalizeOpeningFamilies(building);
  normalizeBimIdentity(building);
  ensureParametricData(building);
  deriveAssociativeDimensions(building);
  deriveModelTags(building);
  deriveLevelAndGridDatums(building);
  phase7ProductionData(building);
  normalizePhase8Data(building);
  normalizePhase10(building);
  normalizePhase12(building);
  regenerateDocumentation(building);
  deriveStructuralGrid(building, building.structural.grid.spacingX || 4, building.structural.grid.spacingZ || 4);
  deriveFoundationSchedule(building);
  deriveRoofConstruction(building);
  deriveCeilingSystems(building);
  deriveConstructionAssemblies(building);
  deriveMepCoordination(building);
  deriveIfcData(building);
  normalizePhase12(building);
  normalizePhase16(building);
  regeneratePhase16(building, { reason: 'geometry-build' });
  normalizePhase18(building);
  normalizePhase19(building);
  normalizePhase19Associativity(building);
  normalizePhase20(building);
  normalizePhase21(building);
  normalizePhase22(building);
  normalizePhase29(building);
  normalizePhase30(building);
  normalizePhase31(building);
  normalizePhase32(building);
  generatePhase32Documentation(building, { projectName: building.name || building.id });
  normalizePhase33(building);
  generatePhase33ExportManifest(building, { projectName: building.name || building.id });
  normalizePhase34(building);
  generatePhase34Package(building);
  phase22AssociativeUpdate(building, 'geometry-build');
  normalizePhase24(building);
  regeneratePhase24(building, 'geometry-build');
  normalizePhase25(building);
  regeneratePhase25(building, 'geometry-build');
  regeneratePhase12Associativity(building, 'geometry-build');
  phase12Coordination(building);
  building.levels.forEach(level => { solveWallNetwork(level); solveProfessionalWallJoins(level); });
  const preReport = validateBuilding(building);
  building = autoRepairBuilding(building);
  const report = validateBuilding(building); // re-check after repair
  report.phase22 = validatePhase22(building);
  report.phase24 = validatePhase24(building);
  report.phase25 = validatePhase25(building);
  report.phase30 = validatePhase30(building);
  report.phase31 = validatePhase31(building);
  report.phase32 = validatePhase32(building);
  report.phase33 = validatePhase33(building);
  report.phase34 = validatePhase34(building);

  const root = new THREE.Group();
  root.name = 'building';
  root.userData.buildingId = building.id;
  root.userData.isArchitecturalIR = true;

  building.levels.forEach((level, li) => {
    const levelGroup = new THREE.Group();
    levelGroup.name = `level_${level.index}`;
    levelGroup.userData.floorIndex = level.index;
    levelGroup.userData.floor = level.index;

    levelGroup.add(buildSlabMesh(level, { isGround: li === 0 }));
    levelGroup.add(buildLevelWalls(level));

    const interiorGroup = new THREE.Group();
    interiorGroup.name = `interior_floor_${level.index}`;
    for (const room of level.rooms) {
      interiorGroup.add(buildRoomFloorAndCeiling(room, level, room.floorFinish || 'tile'));
    }
    levelGroup.add(interiorGroup);
    levelGroup.add(buildLevelComponents(level));

    root.add(levelGroup);
  });

  const stairsGroup = new THREE.Group();
  stairsGroup.name = 'stairs';
  for (const stair of building.stairs) {
    const from = building.levels.find((l) => l.index === stair.fromFloor);
    const to = building.levels.find((l) => l.index === stair.toFloor);
    if (from && to) {
      const stairGroup = buildStairGroup(stair, from, to);
      stairGroup.userData.floor = stair.fromFloor; // ties the stair flight to its lower floor for story-view separation
      stairsGroup.add(stairGroup);
    }
  }
  root.add(stairsGroup);

  root.add(buildPhase22SpaceTopologyGroup(building));

  const top = topLevel(building);
  if (top && building.roof) {
    const roofGroup = buildRoofGroup(top, building.roof, top.elevation + top.height);
    root.add(roofGroup);
  }

  root.add(buildStructuralGroup(building));
  root.add(buildTiedFoundationGroup(building));
  root.add(buildCeilingSystemGroup(building));
  root.add(buildMepGroup(building));
  root.add(buildDisciplineRouteGroup(building));
  root.add(buildSiteCoordinationGroup(building));
  root.add(buildPhase7ProductionGroup(building));
  root.add(buildPhase8ProductionGroup(building));
  root.add(buildAdvancedFoundationGroup(building));
  root.add(buildAdvancedRoofGroup(building));
  root.add(buildAdvancedCeilingGroup(building));
  root.add(buildStructuralGridGroup(building));
  root.add(buildDetailedMepGroup(building));
  root.add(buildPhase12ConstructionGroup(building));
  root.add(buildPhase18ConstructionGroup(building));
  root.add(buildPhase19ComponentDetailGroup(building));
  root.add(buildPhase19WallFaceGuides(building));
  root.add(buildPhase20AuthoringHandles(building));
  root.add(buildPhase21LayeredWallGroup(building));
  root.add(buildPhase21FaceHandles(building));
  root.add(buildPhase24ConstructionGroup(building));
  root.add(buildPhase25MepGroup(building));

  // Safety net: any leaf mesh that wasn't explicitly tagged by its builder
  // inherits its nearest ancestor group's userData.group, so the viewer's
  // per-group recolor and "show interior" roof toggle (which key off each
  // mesh's own userData.group) never silently miss a mesh.
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!obj.userData.group) {
      let ancestor = obj.parent;
      while (ancestor && !ancestor.userData.group) ancestor = ancestor.parent;
      if (ancestor) obj.userData.group = ancestor.userData.group;
    }
    // Same inheritance for floor number, so the "separate floors" story
    // view (which reads each mesh's own userData.floor) moves every mesh
    // on a level — walls, openings, stair flight, interior fittings — as
    // one unit, not just the ones a builder happened to tag directly.
    if (obj.userData.floor == null) {
      let ancestor = obj.parent;
      while (ancestor && ancestor.userData.floor == null) ancestor = ancestor.parent;
      if (ancestor) obj.userData.floor = ancestor.userData.floor;
    }
    // Same for material label and room name — lets PartInfoPanel show real
    // info (e.g. "glazing" / "Master Bedroom") for a window's individual
    // glass/frame meshes, which openingSystem.js only tags on the opening's
    // parent Group, not each leaf mesh inside it.
    if (!obj.userData.material) {
      let ancestor = obj.parent;
      while (ancestor && !ancestor.userData.material) ancestor = ancestor.parent;
      if (ancestor) obj.userData.material = ancestor.userData.material;
    }
    if (!obj.userData.room) {
      let ancestor = obj.parent;
      while (ancestor && !ancestor.userData.room) ancestor = ancestor.parent;
      if (ancestor) obj.userData.room = ancestor.userData.room;
    }
  });

  return {
    group: root,
    building,
    report: { ...report, phase6: validatePhase6(building), phase7: validatePhase7(building), phase8: validatePhase8(building), phase10: validatePhase10(building), phase12: validatePhase12(building), phase16: validatePhase16(building), phase18: validatePhase18(building), phase19: validatePhase19(building), phase20: validatePhase20(building), phase21: validatePhase21(building), phase29: validatePhase29(building), phase30: validatePhase30(building), phase31: validatePhase31(building), phase32: validatePhase32(building), phase33: validatePhase33(building), phase34: validatePhase34(building), warnings: [...new Set([...preReport.warnings, ...report.warnings, ...validatePhase6(building).warnings, ...validatePhase7(building).warnings, ...validatePhase8(building).warnings, ...validatePhase10(building).warnings, ...validatePhase12(building).warnings, ...validatePhase16(building).warnings, ...validatePhase18(building).warnings, ...validatePhase19(building).warnings, ...validatePhase20(building).warnings, ...validatePhase21(building).warnings, ...validatePhase29(building).warnings])] },
  };
}

// Utility for the floor-isolation UI (section 28 of the spec): show only
// one level's walls/interior (plus ground-floor slabs of levels below it),
// or 'all', or 'roof'.
export function setFloorVisibility(buildingGroup, mode) {
  buildingGroup.children.forEach((child) => {
    if (child.name.startsWith('level_')) {
      const idx = child.userData.floorIndex;
      child.visible = mode === 'all' || mode === idx || mode === 'roof-hidden';
    } else if (child.name === 'roof') {
      child.visible = mode !== 'roof-hidden' && mode !== 'interior';
    } else if (child.name === 'stairs') {
      child.visible = true;
    }
  });
}
