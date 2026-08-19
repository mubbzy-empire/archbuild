// ---------------------------------------------------------------------------
// Phase 29 — Blueprint → Professional BIM Reconstruction
//
// This module is deliberately conservative. Vision/LLM output is treated as
// evidence, not truth. The reconstruction package keeps source geometry,
// confidence, scale evidence and human-review state separate from the
// canonical Building IR. A candidate Building is compiled only when the
// detected geometry is explicitly metric and sufficiently confident.
// ---------------------------------------------------------------------------

export const PHASE29_SCHEMA = 'archvision-bim-1.19';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));

const clamp = (n, min, max, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

function id(prefix, i) { return `${prefix}_${i + 1}`; }

function confidence(value, fallback = 0.5) {
  return clamp(value, 0, 1, fallback);
}

function normalizePoint(p) {
  return Array.isArray(p) && p.length >= 2
    ? [Number(p[0]) || 0, Number(p[1]) || 0]
    : null;
}

function normalizeGeometry(g = {}) {
  const units = ['meters', 'image-pixels', 'normalized'].includes(g.units) ? g.units : 'unknown';
  return {
    units,
    imageSize: {
      width: Number(g.imageSize?.width) || null,
      height: Number(g.imageSize?.height) || null,
    },
    walls: Array.isArray(g.walls) ? g.walls.map((w, i) => ({
      id: w.id || id('W', i),
      level: Math.max(1, Math.round(Number(w.level) || 1)),
      start: normalizePoint(w.start),
      end: normalizePoint(w.end),
      thicknessMeters: Number.isFinite(Number(w.thicknessMeters)) ? Number(w.thicknessMeters) : null,
      type: w.type === 'interior' ? 'interior' : 'exterior',
      confidence: confidence(w.confidence, 0.5),
      sourceRef: w.sourceRef || null,
      requiresReview: w.requiresReview !== false,
    })).filter(w => w.start && w.end) : [],
    rooms: Array.isArray(g.rooms) ? g.rooms.map((r, i) => ({
      id: r.id || id('R', i),
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Space ${i + 1}`,
      level: Math.max(1, Math.round(Number(r.level) || 1)),
      polygon: Array.isArray(r.polygon) ? r.polygon.map(normalizePoint).filter(Boolean) : [],
      confidence: confidence(r.confidence, 0.5),
      sourceRef: r.sourceRef || null,
      requiresReview: r.requiresReview !== false,
    })).filter(r => r.polygon.length >= 3) : [],
    openings: Array.isArray(g.openings) ? g.openings.map((o, i) => ({
      id: o.id || id('O', i),
      hostWallId: o.hostWallId || null,
      type: ['door','window','sliding-door','garage-door','french-door'].includes(o.type) ? o.type : 'window',
      offsetAlongWall: Number.isFinite(Number(o.offsetAlongWall)) ? Number(o.offsetAlongWall) : null,
      widthMeters: Number.isFinite(Number(o.widthMeters)) ? Number(o.widthMeters) : null,
      heightMeters: Number.isFinite(Number(o.heightMeters)) ? Number(o.heightMeters) : null,
      sillHeightMeters: Number.isFinite(Number(o.sillHeightMeters)) ? Number(o.sillHeightMeters) : null,
      level: Math.max(1, Math.round(Number(o.level) || 1)),
      confidence: confidence(o.confidence, 0.5),
      sourceRef: o.sourceRef || null,
      requiresReview: o.requiresReview !== false,
    })).filter(o => o.hostWallId || o.sourceRef) : [],
  };
}

function normalizeScale(s = {}) {
  const ratio = Number(s.drawingScale);
  const refMeters = Number(s.referenceLengthMeters);
  const refUnits = Number(s.referenceLengthDrawingUnits);
  const calibrated = Number.isFinite(refMeters) && Number.isFinite(refUnits) && refUnits > 0;
  return {
    source: s.source || 'unverified',
    drawingScale: Number.isFinite(ratio) && ratio > 0 ? ratio : null,
    referenceLabel: s.referenceLabel || null,
    referenceLengthMeters: Number.isFinite(refMeters) ? refMeters : null,
    referenceLengthDrawingUnits: Number.isFinite(refUnits) ? refUnits : null,
    metersPerDrawingUnit: calibrated ? refMeters / refUnits : null,
    calibrated,
    confidence: confidence(s.confidence, calibrated ? 0.8 : 0.25),
    requiresReview: s.requiresReview !== false,
  };
}

export function normalizePhase29(building) {
  building.metadata ||= {};
  building.metadata.schema = PHASE29_SCHEMA;
  building.phase29 ||= {};
  const p = building.phase29;
  p.schema = PHASE29_SCHEMA;
  p.source ||= { type: 'blueprint', fileName: null, projectId: null };
  p.scale ||= normalizeScale({});
  p.geometry ||= normalizeGeometry({});
  p.entities ||= [];
  p.review ||= { status: 'review-required', accepted: [], rejected: [], notes: [], updatedAt: null };
  p.issues ||= [];
  p.compilation ||= { eligible: false, reason: 'No metric, reviewed geometry has been supplied.', candidateBuilding: null };
  p.updatedAt ||= null;
  return building;
}

export function createPhase29Reconstruction(detected = {}, source = {}) {
  const geometry = normalizeGeometry(detected.geometry || detected.reconstruction?.geometry || {});
  const scale = normalizeScale(detected.scale || detected.reconstruction?.scale || {});
  const rooms = Array.isArray(detected.rooms) ? detected.rooms : [];
  const doors = Array.isArray(detected.doors) ? detected.doors : [];
  const windows = Array.isArray(detected.windows) ? detected.windows : [];
  const uncertainties = Array.isArray(detected.uncertain) ? detected.uncertain : [];

  const entities = [
    ...geometry.walls.map((e, i) => ({ id: e.id, kind: 'wall', confidence: e.confidence, status: e.requiresReview ? 'review' : 'proposed', sourceRef: e.sourceRef || null })),
    ...geometry.rooms.map((e) => ({ id: e.id, kind: 'room', confidence: e.confidence, status: e.requiresReview ? 'review' : 'proposed', sourceRef: e.sourceRef || null })),
    ...geometry.openings.map((e) => ({ id: e.id, kind: e.type, confidence: e.confidence, status: e.requiresReview ? 'review' : 'proposed', sourceRef: e.sourceRef || null })),
  ];

  // If the older detector returned semantic objects but no geometry, preserve
  // them as evidence entities. They are never silently compiled into BIM.
  rooms.forEach((r, i) => entities.push({
    id: `SEM-R-${i + 1}`, kind: 'room-evidence', label: r.name || `Room ${i + 1}`,
    confidence: confidence(r.confidence, 0.55), status: 'review', sourceRef: r.sourceRef || null,
  }));
  doors.forEach((d, i) => entities.push({
    id: `SEM-D-${i + 1}`, kind: 'door-evidence', label: d.location || `Door ${i + 1}`,
    confidence: confidence(d.confidence, 0.55), status: 'review', sourceRef: d.sourceRef || null,
  }));
  windows.forEach((w, i) => entities.push({
    id: `SEM-W-${i + 1}`, kind: 'window-evidence', label: w.location || `Window ${i + 1}`,
    confidence: confidence(w.confidence, 0.55), status: 'review', sourceRef: w.sourceRef || null,
  }));

  const issues = [...uncertainties.map((text, i) => ({
    id: `UNC-${i + 1}`, severity: 'review', code: 'VISION_UNCERTAINTY', message: String(text),
  }))];

  const review = {
    status: entities.length ? 'review-required' : 'insufficient-evidence',
    accepted: [], rejected: [], notes: [], updatedAt: null,
  };

  return {
    schema: PHASE29_SCHEMA,
    source: { type: source.type || 'blueprint', fileName: source.fileName || null, projectId: source.projectId || null },
    scale,
    geometry,
    entities,
    review,
    issues,
    compilation: {
      eligible: false,
      reason: geometry.units !== 'meters'
        ? 'Geometry is not explicitly metric; calibration/review is required before BIM compilation.'
        : 'Geometry requires human review before BIM compilation.',
      candidateBuilding: null,
    },
    createdAt: now(),
    updatedAt: now(),
  };
}

export function updatePhase29Review(buildingOrReconstruction, { id: entityId, status, note } = {}) {
  const p = buildingOrReconstruction.phase29 || buildingOrReconstruction;
  p.review ||= { status: 'review-required', accepted: [], rejected: [], notes: [], updatedAt: null };
  if (!entityId) return p;
  const accepted = new Set(p.review.accepted || []);
  const rejected = new Set(p.review.rejected || []);
  accepted.delete(entityId); rejected.delete(entityId);
  if (status === 'accepted') accepted.add(entityId);
  if (status === 'rejected') rejected.add(entityId);
  p.review.accepted = [...accepted];
  p.review.rejected = [...rejected];
  if (note) p.review.notes.push({ entityId, note: String(note), at: now() });
  p.review.updatedAt = now();
  const remaining = (p.entities || []).filter(e => !accepted.has(e.id) && !rejected.has(e.id)).length;
  p.review.status = remaining ? 'review-required' : 'review-complete';
  p.updatedAt = now();
  return p;
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const q = poly[(i + 1) % poly.length];
    a += poly[i][0] * q[1] - q[0] * poly[i][1];
  }
  return Math.abs(a) / 2;
}

export function compilePhase29Candidate(reconstruction, { acceptedOnly = true } = {}) {
  const p = reconstruction.phase29 || reconstruction;
  const g = p.geometry || normalizeGeometry({});
  const accepted = new Set(p.review?.accepted || []);
  if (g.units !== 'meters') {
    p.compilation = { eligible: false, reason: 'Metric geometry is required. Calibrate the drawing before compiling BIM.', candidateBuilding: null };
    return p.compilation;
  }

  const walls = g.walls.filter(w => !acceptedOnly || accepted.has(w.id));
  const rooms = g.rooms.filter(r => !acceptedOnly || accepted.has(r.id));
  const openings = g.openings.filter(o => !acceptedOnly || accepted.has(o.id));
  const missingReview = [...g.walls, ...g.rooms, ...g.openings].filter(e => e.requiresReview && !accepted.has(e.id));
  if (missingReview.length) {
    p.compilation = { eligible: false, reason: `${missingReview.length} detected element(s) still require review.`, candidateBuilding: null };
    return p.compilation;
  }
  if (!walls.length) {
    p.compilation = { eligible: false, reason: 'No accepted wall geometry was detected.', candidateBuilding: null };
    return p.compilation;
  }

  const floors = [...new Set(walls.map(w => w.level))].sort((a,b)=>a-b);
  const levels = floors.map(level => {
    const lw = walls.filter(w => w.level === level).map(w => ({
      id: w.id, start: w.start, end: w.end, thickness: w.thicknessMeters || 0.2,
      height: 3, baseElevation: (level - 1) * 3, type: w.type, material: 'plaster', rooms: [],
      openings: openings.filter(o => o.level === level && o.hostWallId === w.id).map(o => ({
        id: o.id, type: o.type, offsetAlongWall: o.offsetAlongWall || 0,
        width: o.widthMeters || 0.9, height: o.heightMeters || (o.type === 'door' ? 2.1 : 1.2),
        sillHeight: o.sillHeightMeters || (o.type === 'door' ? 0 : 0.9),
      })),
    }));
    const lr = rooms.filter(r => r.level === level).map(r => ({
      id: r.id, name: r.name, type: 'generic', floor: level, polygon: r.polygon, ceilingHeight: 3,
      area: polygonArea(r.polygon),
    }));
    return {
      id: `level_${level}`, index: level, elevation: (level - 1) * 3, height: 3,
      footprint: null, walls: lw, rooms: lr, balconies: [], terraces: [], components: [],
    };
  });

  const candidate = {
    id: `blueprint_${Date.now().toString(36)}`,
    name: p.source?.fileName || 'Blueprint Reconstruction',
    levels,
    stairs: [],
    roof: { type: 'hip', pitchDeg: 24, overhang: 0.5, material: 'metal' },
    metadata: { source: 'phase29-blueprint-reconstruction', schema: PHASE29_SCHEMA },
    phase29: clone(p),
  };
  p.compilation = { eligible: true, reason: 'All metric geometry has been reviewed and accepted.', candidateBuilding: candidate };
  p.updatedAt = now();
  return p.compilation;
}

export function validatePhase29(reconstruction) {
  const p = reconstruction.phase29 || reconstruction;
  const errors = [], warnings = [];
  if (!p || p.schema !== PHASE29_SCHEMA) errors.push('Phase 29 reconstruction schema mismatch.');
  if (!p?.geometry) errors.push('No reconstruction geometry is present.');
  if (p?.geometry?.units !== 'meters') warnings.push('Geometry is not explicitly metric; BIM compilation is blocked until calibrated.');
  if (!p?.entities?.length) warnings.push('No detected entities are available for review.');
  for (const e of p?.entities || []) {
    if (!(e.confidence >= 0 && e.confidence <= 1)) errors.push(`${e.id} has invalid confidence.`);
  }
  for (const i of p?.issues || []) if (!i.message) warnings.push(`${i.id} has no issue message.`);
  return { valid: errors.length === 0, errors, warnings };
}

export function phase29Manifest(reconstruction) {
  const p = reconstruction.phase29 || reconstruction;
  return {
    schema: PHASE29_SCHEMA,
    source: clone(p.source),
    scale: clone(p.scale),
    entityCounts: (p.entities || []).reduce((m, e) => { m[e.kind] = (m[e.kind] || 0) + 1; return m; }, {}),
    review: {
      status: p.review?.status || 'review-required',
      accepted: [...(p.review?.accepted || [])],
      rejected: [...(p.review?.rejected || [])],
      remaining: (p.entities || []).filter(e => !(p.review?.accepted || []).includes(e.id) && !(p.review?.rejected || []).includes(e.id)).length,
    },
    compilation: {
      eligible: !!p.compilation?.eligible,
      reason: p.compilation?.reason || null,
    },
    issues: clone(p.issues || []),
    updatedAt: p.updatedAt || now(),
  };
}
