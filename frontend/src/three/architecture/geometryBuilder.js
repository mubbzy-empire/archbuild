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
import { buildInteriorFurniture } from './interiorFurniture.js';
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
  let preReport = { valid: true, errors: [], warnings: [] };
  let report = { valid: true, errors: [], warnings: [] };
  const phaseWarnings = [];

  // Advanced BIM/documentation phases are valuable, but a malformed AI or
  // legacy object must never prevent the core architectural model from
  // rendering. Run them as a protected preparation pipeline and fall back to
  // the sanitized Building IR if one optional phase receives bad data.
  try {
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
  } catch (err) {
    const message = err?.message || String(err);
    console.warn('[architecture engine] optional BIM preparation skipped:', message);
    phaseWarnings.push(`Advanced BIM preparation skipped: ${message}`);
    building = normalizeBuilding(building);
  }

  try { preReport = validateBuilding(building); } catch (err) { phaseWarnings.push(`Validation warning: ${err?.message || String(err)}`); }
  try { building = autoRepairBuilding(building); } catch (err) { phaseWarnings.push(`Auto-repair warning: ${err?.message || String(err)}`); building = normalizeBuilding(building); }
  try { report = validateBuilding(building); } catch (err) { report = { valid: true, errors: [], warnings: [] }; phaseWarnings.push(`Validation warning: ${err?.message || String(err)}`); }
  const safePhase = (fn, fallback = { valid: true, errors: [], warnings: [] }) => {
    try { return fn(); } catch (err) { phaseWarnings.push(`Optional phase skipped: ${err?.message || String(err)}`); return fallback; }
  };
  report.phase22 = safePhase(() => validatePhase22(building));
  report.phase24 = safePhase(() => validatePhase24(building));
  report.phase25 = safePhase(() => validatePhase25(building));
  report.phase30 = safePhase(() => validatePhase30(building));
  report.phase31 = safePhase(() => validatePhase31(building));
  report.phase32 = safePhase(() => validatePhase32(building));
  report.phase33 = safePhase(() => validatePhase33(building));
  report.phase34 = safePhase(() => validatePhase34(building));

  const root = new THREE.Group();
  root.name = 'building';
  root.userData.buildingId = building.id;
  root.userData.isArchitecturalIR = true;

  const safeAdd = (parent, factory, label) => {
    try {
      const child = factory();
      if (child) parent.add(child);
    } catch (err) {
      phaseWarnings.push(`${label} skipped: ${err?.message || String(err)}`);
      console.warn(`[architecture engine] ${label} skipped:`, err);
    }
  };

  building.levels.forEach((level, li) => {
    const levelGroup = new THREE.Group();
    levelGroup.name = `level_${level.index}`;
    levelGroup.userData.floorIndex = level.index;
    levelGroup.userData.floor = level.index;
    safeAdd(levelGroup, () => buildSlabMesh(level, { isGround: li === 0 }), `Floor ${level.index} slab`);
    safeAdd(levelGroup, () => buildLevelWalls(level), `Floor ${level.index} walls`);
    const interiorGroup = new THREE.Group();
    interiorGroup.name = `interior_floor_${level.index}`;
    interiorGroup.userData.group = 'interior';
    for (const room of level.rooms || []) {
      safeAdd(interiorGroup, () => buildRoomFloorAndCeiling(room, level, room.floorFinish || 'tile'), `Room ${room.name || room.id} surfaces`);
      safeAdd(interiorGroup, () => buildInteriorFurniture(room, level), `Room ${room.name || room.id} furniture`);
    }
    levelGroup.add(interiorGroup);
    safeAdd(levelGroup, () => buildLevelComponents(level), `Floor ${level.index} components`);
    root.add(levelGroup);
  });

  const stairsGroup = new THREE.Group();
  stairsGroup.name = 'stairs';
  for (const stair of building.stairs || []) {
    const from = building.levels.find((l) => l.index === stair.fromFloor);
    const to = building.levels.find((l) => l.index === stair.toFloor);
    if (from && to) safeAdd(stairsGroup, () => { const g = buildStairGroup(stair, from, to); g.userData.floor = stair.fromFloor; return g; }, `Stair ${stair.id || ''}`);
  }
  root.add(stairsGroup);

  safeAdd(root, () => buildPhase22SpaceTopologyGroup(building), 'Space topology');
  const top = topLevel(building);
  if (top && building.roof) safeAdd(root, () => buildRoofGroup(top, building.roof, top.elevation + top.height), 'Roof');
  safeAdd(root, () => buildStructuralGroup(building), 'Structural system');
  safeAdd(root, () => buildTiedFoundationGroup(building), 'Foundation system');
  safeAdd(root, () => buildCeilingSystemGroup(building), 'Ceiling system');
  safeAdd(root, () => buildMepGroup(building), 'MEP system');
  safeAdd(root, () => buildDisciplineRouteGroup(building), 'Discipline routes');
  safeAdd(root, () => buildSiteCoordinationGroup(building), 'Site coordination');
  safeAdd(root, () => buildPhase7ProductionGroup(building), 'Phase 7 production');
  safeAdd(root, () => buildPhase8ProductionGroup(building), 'Phase 8 production');
  safeAdd(root, () => buildAdvancedFoundationGroup(building), 'Advanced foundation');
  safeAdd(root, () => buildAdvancedRoofGroup(building), 'Advanced roof');
  safeAdd(root, () => buildAdvancedCeilingGroup(building), 'Advanced ceiling');
  safeAdd(root, () => buildStructuralGridGroup(building), 'Structural grid');
  safeAdd(root, () => buildDetailedMepGroup(building), 'Detailed MEP');
  safeAdd(root, () => buildPhase12ConstructionGroup(building), 'Phase 12 construction');
  safeAdd(root, () => buildPhase18ConstructionGroup(building), 'Phase 18 construction');
  safeAdd(root, () => buildPhase19ComponentDetailGroup(building), 'Phase 19 components');
  safeAdd(root, () => buildPhase19WallFaceGuides(building), 'Phase 19 wall guides');
  safeAdd(root, () => buildPhase20AuthoringHandles(building), 'Phase 20 handles');
  safeAdd(root, () => buildPhase21LayeredWallGroup(building), 'Phase 21 layered walls');
  safeAdd(root, () => buildPhase21FaceHandles(building), 'Phase 21 face handles');
  safeAdd(root, () => buildPhase24ConstructionGroup(building), 'Phase 24 construction');
  safeAdd(root, () => buildPhase25MepGroup(building), 'Phase 25 MEP');

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (!obj.userData.group) {
      let ancestor = obj.parent;
      while (ancestor && !ancestor.userData.group) ancestor = ancestor.parent;
      if (ancestor) obj.userData.group = ancestor.userData.group;
    }
    if (obj.userData.floor == null) {
      let ancestor = obj.parent;
      while (ancestor && ancestor.userData.floor == null) ancestor = ancestor.parent;
      if (ancestor) obj.userData.floor = ancestor.userData.floor;
    }
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

  const allWarnings = [...new Set([...(preReport.warnings || []), ...(report.warnings || []), ...phaseWarnings])];
  return { group: root, building, report: { ...report, warnings: allWarnings } };
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
