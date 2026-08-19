// ---------------------------------------------------------------------------
// Phase 30 — Professional Model QA & Issue Coordination
//
// Phase 29 turns reviewed blueprint evidence into a candidate BIM. Phase 30
// is the professional QA gate: deterministic checks inspect the resulting
// Building IR, register actionable issues, track dispositions, and produce a
// coordination manifest. It never silently repairs design intent.
// ---------------------------------------------------------------------------

export const PHASE30_SCHEMA = 'archvision-bim-1.20';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const finite = v => Number.isFinite(Number(v));
const num = (v, fallback=0) => finite(v) ? Number(v) : fallback;

export function normalizePhase30(building) {
  building.metadata ||= {};
  building.metadata.schema = PHASE30_SCHEMA;
  building.phase30 ||= {};
  const p = building.phase30;
  p.schema = PHASE30_SCHEMA;
  p.status ||= 'not-run';
  p.issues ||= [];
  p.review ||= { accepted: [], rejected: [], notes: [], updatedAt: null };
  p.summary ||= { errors: 0, warnings: 0, info: 0, open: 0, accepted: 0, rejected: 0 };
  p.runCount ||= 0;
  p.updatedAt ||= null;
  return building;
}

function issue(id, severity, code, message, refs=[], phase='model-qa') {
  return { id, severity, code, message, refs, phase, status:'open', createdAt:now(), updatedAt:now() };
}

function wallLength(w) {
  if (!Array.isArray(w.start) || !Array.isArray(w.end)) return 0;
  return Math.hypot(num(w.end[0])-num(w.start[0]), num(w.end[1])-num(w.start[1]));
}

function polygonArea(poly) {
  if (!Array.isArray(poly) || poly.length < 3) return 0;
  let a=0;
  for(let i=0;i<poly.length;i++){
    const q=poly[(i+1)%poly.length];
    a += num(poly[i]?.[0])*num(q?.[1]) - num(q?.[0])*num(poly[i]?.[1]);
  }
  return Math.abs(a)/2;
}

function endpointKey(p, precision=4) {
  return `${Number(p[0]).toFixed(precision)},${Number(p[1]).toFixed(precision)}`;
}

function collectIds(building) {
  const ids = new Map();
  for (const level of building.levels || []) {
    for (const w of level.walls || []) if (w.id) ids.set(w.id, (ids.get(w.id)||0)+1);
    for (const r of level.rooms || []) if (r.id) ids.set(r.id, (ids.get(r.id)||0)+1);
    for (const c of level.components || []) if (c.id) ids.set(c.id, (ids.get(c.id)||0)+1);
  }
  return ids;
}

export function runPhase30QA(building, { includeInfo=true }={}) {
  normalizePhase30(building);
  const p=building.phase30;
  const issues=[];
  const levels=Array.isArray(building.levels)?building.levels:[];

  if (!levels.length) issues.push(issue('QA-LEVEL-001','error','NO_LEVELS','The model contains no levels.'));
  const ids=collectIds(building);
  for (const [id,count] of ids) if(count>1) issues.push(issue(`QA-ID-${id}`,'error','DUPLICATE_ID',`Duplicate model element ID: ${id}.`,[id]));

  for(const level of levels){
    const walls=Array.isArray(level.walls)?level.walls:[];
    const rooms=Array.isArray(level.rooms)?level.rooms:[];
    const wallIds=new Set(walls.map(w=>w.id).filter(Boolean));

    for(const w of walls){
      const len=wallLength(w);
      if(len < 0.05) issues.push(issue(`QA-WALL-${w.id}-SHORT`,'error','ZERO_OR_TINY_WALL',`Wall ${w.id||'(unnamed)'} is shorter than 50 mm.`,[w.id]));
      if(!finite(w.thickness) || num(w.thickness)<=0) issues.push(issue(`QA-WALL-${w.id}-THICK`,'error','INVALID_WALL_THICKNESS',`Wall ${w.id||'(unnamed)'} has no positive thickness.`,[w.id]));
      if(num(w.height)<=0) issues.push(issue(`QA-WALL-${w.id}-HEIGHT`,'error','INVALID_WALL_HEIGHT',`Wall ${w.id||'(unnamed)'} has no positive height.`,[w.id]));
    }

    const endpointMap=new Map();
    for(const w of walls){
      for(const pnt of [w.start,w.end]){
        if(!Array.isArray(pnt)) continue;
        const k=endpointKey(pnt);
        if(!endpointMap.has(k)) endpointMap.set(k,[]);
        endpointMap.get(k).push(w.id);
      }
    }
    // A single dangling wall endpoint is a coordination warning, not an
    // automatic error: openings, façade breaks and design intent can create
    // legitimate discontinuities.
    for(const [k,refs] of endpointMap){
      if(refs.length===1) issues.push(issue(`QA-JOIN-${k}`,'warning','DANGLING_WALL_ENDPOINT','Wall endpoint does not join another wall segment.',refs));
    }

    for(const r of rooms){
      const area=polygonArea(r.polygon);
      if(area < 0.25) issues.push(issue(`QA-ROOM-${r.id}-AREA`,'warning','TINY_ROOM_AREA',`Room ${r.id||'(unnamed)'} has an area below 0.25 m².`,[r.id]));
      if((r.polygon||[]).length<3) issues.push(issue(`QA-ROOM-${r.id}-POLY`,'error','INVALID_ROOM_POLYGON',`Room ${r.id||'(unnamed)'} does not have a valid polygon.`,[r.id]));
    }

    for(const w of walls){
      for(const o of w.openings||[]){
        if(o.hostWallId && o.hostWallId!==w.id) issues.push(issue(`QA-OPEN-${o.id}-HOST`,'error','OPENING_HOST_MISMATCH',`Opening ${o.id||'(unnamed)'} is attached to ${o.hostWallId} but stored on ${w.id}.`,[o.id,w.id,o.hostWallId]));
        if(num(o.width)<=0) issues.push(issue(`QA-OPEN-${o.id}-WIDTH`,'error','INVALID_OPENING_WIDTH',`Opening ${o.id||'(unnamed)'} has no positive width.`,[o.id]));
        if(num(o.offsetAlongWall)<0 || num(o.offsetAlongWall)>wallLength(w)+0.001) issues.push(issue(`QA-OPEN-${o.id}-OFFSET`,'error','OPENING_OFFSET_OUT_OF_RANGE',`Opening ${o.id||'(unnamed)'} is outside its host wall.`,[o.id,w.id]));
      }
    }

    const levelArea=rooms.reduce((s,r)=>s+polygonArea(r.polygon),0);
    if(includeInfo && levelArea>0) issues.push(issue(`QA-LEVEL-${level.index}-INFO`,'info','LEVEL_ROOM_AREA',`Level ${level.index} contains approximately ${levelArea.toFixed(2)} m² of room polygon area.`,rooms.map(r=>r.id).filter(Boolean)));
    if(includeInfo && wallIds.size===0) issues.push(issue(`QA-LEVEL-${level.index}-NOWALLS`,'warning','LEVEL_WITHOUT_WALLS',`Level ${level.index} contains no walls.`));
  }

  // MEP/structural coordination hooks: flag explicit clashes if previous
  // systems already recorded them, without inventing new clashes.
  const clashes=building.phase25?.clashes || building.clashes || [];
  for(const c of clashes) issues.push(issue(`QA-CLASH-${c.id||issues.length}`,'error','EXISTING_COORDINATION_CLASH',c.message||'A coordination clash is present.',c.refs||[], 'coordination'));

  p.issues=issues;
  p.runCount=(p.runCount||0)+1;
  p.status=issues.some(x=>x.severity==='error')?'failed':issues.some(x=>x.severity==='warning')?'passed-with-warnings':'passed';
  p.summary={
    errors:issues.filter(x=>x.severity==='error').length,
    warnings:issues.filter(x=>x.severity==='warning').length,
    info:issues.filter(x=>x.severity==='info').length,
    open:issues.length, accepted:0, rejected:0
  };
  p.updatedAt=now();
  return {valid:p.summary.errors===0, status:p.status, issues:clone(issues), summary:clone(p.summary)};
}

export function updatePhase30Issue(building,{id,status,note}={}) {
  normalizePhase30(building);
  const p=building.phase30;
  const item=p.issues.find(x=>x.id===id);
  if(!item) return null;
  if(!['open','accepted','rejected'].includes(status)) return item;
  item.status=status; item.updatedAt=now();
  if(note) (p.review.notes ||= []).push({issueId:id,note:String(note),at:now()});
  p.review.accepted=(p.issues.filter(x=>x.status==='accepted').map(x=>x.id));
  p.review.rejected=(p.issues.filter(x=>x.status==='rejected').map(x=>x.id));
  p.summary.open=p.issues.filter(x=>x.status==='open').length;
  p.summary.accepted=p.review.accepted.length;
  p.summary.rejected=p.review.rejected.length;
  p.updatedAt=now();
  return item;
}

export function validatePhase30(building) {
  normalizePhase30(building);
  const p=building.phase30, errors=[], warnings=[];
  if(p.schema!==PHASE30_SCHEMA) errors.push('Phase 30 schema mismatch.');
  if(!Array.isArray(p.issues)) errors.push('Phase 30 issue registry is missing.');
  if(p.status==='not-run') warnings.push('Professional model QA has not been run.');
  if(p.summary.open !== (p.issues||[]).filter(x=>x.status==='open').length) errors.push('Phase 30 summary open count is stale.');
  return {valid:errors.length===0,errors,warnings};
}

export function phase30Manifest(building) {
  normalizePhase30(building);
  const p=building.phase30;
  return {
    schema:PHASE30_SCHEMA,
    status:p.status, runCount:p.runCount,
    summary:clone(p.summary),
    issues:clone(p.issues),
    review:clone(p.review),
    updatedAt:p.updatedAt
  };
}
