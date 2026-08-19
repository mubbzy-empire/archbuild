// Phase 12 — construction-grade geometry, associative regeneration and coordination.
export const PHASE12_SCHEMA = 'archvision-bim-1.2';

const clone = v => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot(b[0]-a[0], b[1]-a[1]);
const wallLength = w => dist(w.start,w.end);
const polygonArea = pts => Math.abs((pts||[]).reduce((a,p,i)=>{const q=pts[(i+1)%pts.length];return a+p[0]*q[1]-q[0]*p[1]},0)/2);

export const DEFAULT_ASSEMBLIES = {
  'EXT-WALL-200': { name:'External insulated wall', totalThickness:0.20, layers:[
    {name:'External render',material:'render',thickness:0.015},
    {name:'Blockwork',material:'masonry',thickness:0.15},
    {name:'Insulation',material:'mineral-wool',thickness:0.025},
    {name:'Internal plaster',material:'plaster',thickness:0.01},
  ]},
  'INT-WALL-100': { name:'Internal partition', totalThickness:0.10, layers:[
    {name:'Plaster',material:'plaster',thickness:0.0125},
    {name:'Partition core',material:'gypsum-stud',thickness:0.075},
    {name:'Plaster',material:'plaster',thickness:0.0125},
  ]},
  'RC-SLAB-150': { name:'Reinforced concrete floor', totalThickness:0.15, layers:[
    {name:'Floor finish',material:'tile',thickness:0.012},
    {name:'RC slab',material:'concrete',thickness:0.12},
    {name:'Screed',material:'screed',thickness:0.018},
  ]},
  'CEIL-PB-100': { name:'Plasterboard ceiling', totalThickness:0.10, layers:[
    {name:'Plasterboard',material:'plasterboard',thickness:0.0125},
    {name:'Service void',material:'service-void',thickness:0.0875},
  ]},
  'ROOF-METAL-180': { name:'Insulated metal roof', totalThickness:0.18, layers:[
    {name:'Metal sheet',material:'metal',thickness:0.01},
    {name:'Insulation',material:'mineral-wool',thickness:0.12},
    {name:'Roof deck',material:'plywood',thickness:0.05},
  ]},
};

function assemblyForWall(w){ return w.assemblyId || (w.type==='interior'?'INT-WALL-100':'EXT-WALL-200'); }
function pointAlong(w,t,lateral=0){const len=wallLength(w)||1;const ux=(w.end[0]-w.start[0])/len, uz=(w.end[1]-w.start[1])/len;return [w.start[0]+ux*t+uz*lateral,w.start[1]+uz*t-ux*lateral];}

export function normalizePhase12(building){
  building.metadata ||= {};
  building.metadata.schema = PHASE12_SCHEMA;
  building.phase12 ||= {};
  building.phase12.assemblies ||= clone(DEFAULT_ASSEMBLIES);
  building.phase12.wallLayers ||= [];
  building.phase12.roofFraming ||= [];
  building.phase12.stairDetails ||= [];
  building.phase12.openingDetails ||= [];
  building.phase12.mepFittings ||= [];
  building.phase12.associative ||= {version:1,lastRegenerated:null,changes:[]};
  building.phase12.coordination ||= {clashes:[],lastRun:null};
  for(const level of building.levels||[]) for(const wall of level.walls||[]) {
    wall.assemblyId ||= assemblyForWall(wall);
    wall.construction ||= {loadBearing:wall.type==='exterior',fireRating:wall.type==='exterior'?'60min':'30min'};
  }
  return building;
}

export function deriveWallLayerGeometry(building){
  normalizePhase12(building); const rows=[];
  for(const level of building.levels||[]) for(const w of level.walls||[]){
    const a=building.phase12.assemblies[w.assemblyId] || DEFAULT_ASSEMBLIES[w.assemblyId] || DEFAULT_ASSEMBLIES['EXT-WALL-200'];
    const scale=(w.thickness||a.totalThickness)/a.totalThickness; let offset=-(a.totalThickness*scale)/2;
    for(const layer of a.layers){ const t=layer.thickness*scale; rows.push({id:`${w.id}:${layer.material}`,wallId:w.id,level:level.index,name:layer.name,material:layer.material,thickness:t,offset:offset+t/2,height:w.height||level.height,start:w.start,end:w.end,baseElevation:level.elevation}); offset+=t; }
  }
  building.phase12.wallLayers=rows; return rows;
}

export function deriveOpeningDetails(building){
  normalizePhase12(building); const rows=[];
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const o of wall.openings||[]){
    const family=o.family || (o.type==='window'?'casement':'single-hinged');
    const frame=o.frameMaterial || (family.includes('aluminium')?'aluminium':'wood');
    rows.push({id:o.id,wallId:wall.id,hostWallId:wall.id,level:level.index,family,frame,reveal:o.reveal||0.06,width:o.width,height:o.height,sillHeight:o.sillHeight||0,leafCount:o.leafCount||((family.includes('double')||family.includes('french'))?2:1),swing:o.swing||'right',glazing:o.glazing||'clear-low-e'});
    o.family=family; o.frameMaterial=frame; o.reveal=o.reveal||0.06; o.glazing=o.glazing||'clear-low-e';
  }
  building.phase12.openingDetails=rows; return rows;
}

export function deriveStairConstruction(building){
  normalizePhase12(building); const rows=[];
  for(const s of building.stairs||[]){
    const from=building.levels.find(l=>l.index===s.fromFloor), to=building.levels.find(l=>l.index===s.toFloor); if(!from||!to) continue;
    const rise=Math.max(0.1,(to.elevation-from.elevation)); const target=s.riserHeight||0.175; const risers=Math.max(1,Math.round(rise/target)); const rh=rise/risers; const tread=s.treadDepth||0.28; const run=(risers-1)*tread;
    rows.push({id:s.id,fromFloor:s.fromFloor,toFloor:s.toFloor,type:s.type,width:s.width,risers,riserHeight:rh,treadDepth:tread,run,landingDepth:Math.max(s.width,1.0),headroom:2.05,guardHeight:1.1,handrailHeight:0.9,slabOpening:{width:s.width+0.3,length:run+0.6}});
  }
  building.phase12.stairDetails=rows; return rows;
}

export function deriveRoofFraming(building){
  normalizePhase12(building); const top=building.levels?.at(-1); if(!top) return [];
  const pts=top.footprint||[]; const out=[]; const base=top.elevation+top.height; const pitch=(building.roof?.pitchDeg||24)*Math.PI/180;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const len=dist(a,b);out.push({id:`rafter-${i+1}`,type:'rafter',start:[a[0],base,a[1]],end:[b[0],base,b[1]],length:len,spacing:0.6});}
  if(['hip','gable'].includes(building.roof?.type||'hip') && pts.length>=4){const c=pts.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]).map(v=>v/pts.length); out.push({id:'ridge-main',type:'ridge',start:[pts[0][0],base+Math.tan(pitch)*0.5,pts[0][1]],end:[pts[2]?.[0]??c[0],base+Math.tan(pitch)*0.5,pts[2]?.[1]??c[1]],length:dist(pts[0],pts[2]||c)}); }
  building.phase12.roofFraming=out; return out;
}

export function deriveMepFittings(building){
  normalizePhase12(building); const rows=[];
  for(const [discipline,sys] of Object.entries(building.systems||{})) for(const r of sys.routes||[]){
    const pts=r.points||[]; pts.forEach((p,i)=>{ if(i===0||i===pts.length-1||i>0&&i<pts.length-1) rows.push({id:`${r.id}-fit-${i+1}`,routeId:r.id,discipline,type:i===0?'connection':i===pts.length-1?'terminal':'elbow',position:p}); });
  }
  building.phase12.mepFittings=rows; return rows;
}

export function regeneratePhase12Associativity(building, reason='manual'){
  normalizePhase12(building);
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const o of wall.openings||[]) {
    const len=wallLength(wall); const min=o.width/2+0.05; o.offsetAlongWall=Math.max(min,Math.min(o.offsetAlongWall||min,Math.max(min,len-o.width/2-0.05))); o.hostWallId=wall.id; o.hostLevel=level.index;
  }
  deriveWallLayerGeometry(building); deriveOpeningDetails(building); deriveStairConstruction(building); deriveRoofFraming(building); deriveMepFittings(building);
  building.phase12.associative.lastRegenerated=new Date().toISOString(); building.phase12.associative.changes.push({timestamp:building.phase12.associative.lastRegenerated,reason}); building.phase12.associative.changes=building.phase12.associative.changes.slice(-50);
  return building;
}

export function phase12Coordination(building){
  normalizePhase12(building); const clashes=[];
  const items=[];
  for(const l of building.levels||[]) { for(const w of l.walls||[]) items.push({id:w.id,type:'wall',level:l.index,a:w.start,b:w.end,thickness:w.thickness||.2}); for(const c of l.components||[]) items.push({id:c.id,type:c.type,level:l.index,pos:c.position,size:c.size}); }
  const pointNearSegment=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],d=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/d));const q=[a[0]+t*dx,a[1]+t*dz];return Math.hypot(p[0]-q[0],p[1]-q[1]);};
  for(const item of building.phase12.mepFittings||[]) for(const x of items){if(item.position?.length>=3&&x.level===item.level){const p=[item.position[0],item.position[2]];let d=Infinity;if(x.type==='wall')d=pointNearSegment(p,x.a,x.b)-x.thickness/2;else if(x.pos){d=Math.hypot(p[0]-x.pos[0],p[1]-x.pos[2])-Math.max(x.size?.[0]||.2,x.size?.[2]||.2)/2;} if(d<0.02) clashes.push({id:`P12-${clashes.length+1}`,severity:'review',level:x.level,element:item.id,host:x.id,message:`${item.discipline} fitting ${item.id} is within ${Math.max(0,d).toFixed(3)}m of ${x.type} ${x.id}`});}}
  building.phase12.coordination={clashes,lastRun:new Date().toISOString()}; return building.phase12.coordination;
}

export function phase12Manifest(building){normalizePhase12(building);return {schema:PHASE12_SCHEMA,project:{id:building.id,name:building.name},counts:{wallLayers:building.phase12.wallLayers.length,openingDetails:building.phase12.openingDetails.length,stairDetails:building.phase12.stairDetails.length,roofFraming:building.phase12.roofFraming.length,mepFittings:building.phase12.mepFittings.length,coordinationClashes:building.phase12.coordination?.clashes?.length||0},assemblies:building.phase12.assemblies,associative:building.phase12.associative,notes:['Phase 12 construction geometry is design-authoring data, not engineering certification.','Coordination checks are deterministic geometry checks and require professional review.']};}

export function validatePhase12(building){normalizePhase12(building);const errors=[],warnings=[];if(!building.phase12.wallLayers.length)warnings.push('No construction wall layers have been derived.');for(const s of building.phase12.stairDetails){if(s.riserHeight<0.15||s.riserHeight>0.2)warnings.push(`Stair ${s.id} riser height ${Math.round(s.riserHeight*1000)}mm is outside the configured target range.`);if(2*s.riserHeight+s.treadDepth<0.55||2*s.riserHeight+s.treadDepth>0.72)warnings.push(`Stair ${s.id} comfort ratio requires review.`);}for(const o of building.phase12.openingDetails){if(!o.hostWallId)errors.push(`Opening ${o.id} has no host wall.`);}if((building.phase12.coordination?.clashes||[]).length)warnings.push(`${building.phase12.coordination.clashes.length} Phase 12 fitting coordination issue(s) require review.`);return {valid:errors.length===0,errors,warnings};}
