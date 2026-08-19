import { wallLength, nextId } from './buildingModel.js';
import { roomArea } from './documentation.js';

export const PHASE9_SCHEMA = 'archvision-bim-0.9';

const EPS = 1e-6;
const dist = (a,b) => Math.hypot((b[0]-a[0]), (b[1]-a[1]));
const angle = (a,b) => Math.atan2(b[1]-a[1], b[0]-a[0]);
const mid = (a,b) => [(a[0]+b[0])/2,(a[1]+b[1])/2];

export function drawingLayers() {
  return [
    { id:'A-WALL', name:'Walls', lineWeight:0.50, linetype:'continuous', visible:true },
    { id:'A-OPEN', name:'Doors & Windows', lineWeight:0.35, linetype:'continuous', visible:true },
    { id:'A-FURN', name:'Furniture / Objects', lineWeight:0.18, linetype:'continuous', visible:true },
    { id:'A-DIMS', name:'Dimensions', lineWeight:0.18, linetype:'continuous', visible:true },
    { id:'A-ANNO', name:'Annotations', lineWeight:0.18, linetype:'continuous', visible:true },
    { id:'A-GRID', name:'Grids', lineWeight:0.13, linetype:'center', visible:true },
    { id:'A-OVER', name:'Overhead', lineWeight:0.18, linetype:'dashed', visible:true },
    { id:'A-HIDN', name:'Hidden', lineWeight:0.13, linetype:'hidden', visible:false },
    { id:'A-MEP', name:'MEP', lineWeight:0.18, linetype:'continuous', visible:true },
    { id:'A-SITE', name:'Site', lineWeight:0.25, linetype:'continuous', visible:true },
  ];
}

export function normalizeDrafting(building) {
  building.documentation ||= {};
  building.documentation.drafting ||= {};
  const d = building.documentation.drafting;
  d.schema = PHASE9_SCHEMA;
  d.layers ||= drawingLayers();
  d.scale ||= '1:100';
  d.units ||= 'mm';
  d.lineWeights ||= 'ISO 128 / architectural';
  d.north ||= { angle: 0, label: 'N' };
  d.titleBlock ||= { project: building.name || 'ARCHVISION PROJECT', drawingNumber:'A-101', drawnBy:'ARCHVISION', checkedBy:'—', revision:'P01', date:new Date().toISOString().slice(0,10) };
  d.print ||= { paper:'A1', orientation:'landscape', marginsMm:10 };
  return d;
}

export function deriveNorthArrow(building, position=[0,0]) {
  normalizeDrafting(building);
  return { id:'north-arrow', position, angle: building.documentation.drafting.north.angle || 0, label:'N', layer:'A-ANNO' };
}

export function deriveArchitecturalDimensions(building) {
  const dimensions=[];
  for (const level of building.levels || []) {
    const walls=level.walls||[];
    for (const w of walls) {
      const len=wallLength(w); if (len < EPS) continue;
      const m=mid(w.start,w.end); const a=angle(w.start,w.end); const normal=[-Math.sin(a),Math.cos(a)];
      const offset=0.35;
      dimensions.push({ id:`${w.id}-dim`, type:'wall', level:level.index, hostId:w.id, a:[w.start[0]+normal[0]*offset,w.start[1]+normal[1]*offset], b:[w.end[0]+normal[0]*offset,w.end[1]+normal[1]*offset], value:Number(len.toFixed(3)), text:`${len.toFixed(2)} m`, layer:'A-DIMS', associative:true });
      for (const o of w.openings||[]) {
        const t=Math.max(0,Math.min(1,o.offsetAlongWall/len));
        const p=[w.start[0]+(w.end[0]-w.start[0])*t,w.start[1]+(w.end[1]-w.start[1])*t];
        dimensions.push({ id:`${o.id}-dim`, type:'opening', level:level.index, hostId:o.id, wallId:w.id, center:p, value:o.width, text:`${o.width.toFixed(2)} m`, layer:'A-DIMS', associative:true });
      }
    }
  }
  return dimensions;
}

export function derivePlanAnnotations(building, levelIndex) {
  const level=(building.levels||[]).find(l=>l.index===levelIndex); if(!level) return [];
  const out=[];
  for(const room of level.rooms||[]) {
    const p=room.polygon||[]; if(!p.length) continue;
    const c=p.reduce((s,x)=>[s[0]+x[0]/p.length,s[1]+x[1]/p.length],[0,0]);
    out.push({ id:`${room.id}-tag`, type:'room', hostId:room.id, position:c, text:`${room.name||room.type||'ROOM'}\n${roomArea(p).toFixed(2)} m²`, layer:'A-ANNO' });
  }
  for(const w of level.walls||[]) for(const o of w.openings||[]) {
    const len=wallLength(w), t=Math.max(0,Math.min(1,o.offsetAlongWall/len));
    const p=[w.start[0]+(w.end[0]-w.start[0])*t,w.start[1]+(w.end[1]-w.start[1])*t];
    out.push({ id:`${o.id}-tag`, type:o.type.includes('door')?'door':'window', hostId:o.id, position:[p[0],p[1]-0.25], text:o.type.includes('door')?'D':'W', layer:'A-ANNO' });
  }
  return out;
}

export function deriveSectionMarkers(building) {
  const out=[];
  for(const level of building.levels||[]) {
    const pts=level.footprint||[]; if(pts.length<3) continue;
    const xs=pts.map(p=>p[0]), zs=pts.map(p=>p[1]);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minZ=Math.min(...zs), maxZ=Math.max(...zs);
    out.push({id:`S-${level.index}-A`,level:level.index,type:'section',label:'A',a:[minX-0.8,(minZ+maxZ)/2],b:[maxX+0.8,(minZ+maxZ)/2],layer:'A-ANNO'});
    out.push({id:`S-${level.index}-B`,level:level.index,type:'section',label:'B',a:[(minX+maxX)/2,minZ-0.8],b:[(minX+maxX)/2,maxZ+0.8],layer:'A-ANNO'});
  }
  return out;
}

export function deriveDrawingViews(building) {
  normalizeDrafting(building);
  const views=[];
  for(const level of building.levels||[]) {
    views.push({id:`A-${100+level.index}`, type:'plan', level:level.index, title:`F${level.index} Floor Plan`, scale:'1:100', layers:['A-WALL','A-OPEN','A-DIMS','A-ANNO','A-GRID','A-MEP']});
  }
  views.push({id:'A-201',type:'elevation',title:'Elevations',scale:'1:100',direction:'front'});
  views.push({id:'A-301',type:'section',title:'Section A-A',scale:'1:100',axis:'x',cut:0});
  views.push({id:'A-302',type:'section',title:'Section B-B',scale:'1:100',axis:'z',cut:0});
  views.push({id:'A-401',type:'schedule',title:'Door / Window Schedule',scale:'—'});
  return views;
}

export function derivePhase9Sheets(building) {
  const views=deriveDrawingViews(building);
  return [
    {id:'A-001',title:'Cover / General Notes',type:'cover',scale:'—',paper:'A1'},
    ...views.filter(v=>v.type==='plan').map(v=>({id:v.id,title:v.title,type:'plan',level:v.level,scale:v.scale,paper:'A1'})),
    {id:'A-201',title:'Elevations',type:'elevation',scale:'1:100',paper:'A1'},
    {id:'A-301',title:'Sections',type:'section',scale:'1:100',paper:'A1'},
    {id:'A-401',title:'Door / Window Schedule',type:'schedule',scale:'—',paper:'A1'},
    {id:'M-101',title:'MEP Coordination Plan',type:'mep',scale:'1:100',paper:'A1'},
  ];
}

export function regeneratePhase9Documentation(building) {
  normalizeDrafting(building);
  for (const level of building.levels || []) for (const wall of level.walls || []) {
    const len = wallLength(wall);
    for (const opening of wall.openings || []) {
      opening.width = Math.min(Math.max(0.3, opening.width || 0.9), Math.max(0.2, len - 0.2), Math.max(0.2, len * 0.8));
      const minOffset = opening.width / 2; const maxOffset = Math.max(minOffset, len - opening.width / 2);
      opening.offsetAlongWall = Math.max(minOffset, Math.min(maxOffset, opening.offsetAlongWall ?? len / 2));
      opening.hostWallId = wall.id;
    }
  }
  building.documentation.drafting.dimensions=deriveArchitecturalDimensions(building);
  building.documentation.drafting.annotations=(building.levels||[]).flatMap(l=>derivePlanAnnotations(building,l.index));
  building.documentation.drafting.sectionMarkers=deriveSectionMarkers(building);
  building.documentation.views=deriveDrawingViews(building);
  building.documentation.sheets=derivePhase9Sheets(building);
  building.documentation.drafting.northArrow=deriveNorthArrow(building,[8,6]);
  return building;
}

export function validatePhase9(building) {
  const errors=[], warnings=[]; normalizeDrafting(building);
  const d=building.documentation.drafting;
  if(!d.layers?.length) errors.push('No drafting layers configured.');
  if(!d.scale) errors.push('Drawing scale is undefined.');
  if(!building.documentation.views?.some(v=>v.type==='plan')) errors.push('No floor plan view exists.');
  if(!building.documentation.views?.some(v=>v.type==='section')) errors.push('No section view exists.');
  if(!building.documentation.views?.some(v=>v.type==='elevation')) errors.push('No elevation view exists.');
  for(const level of building.levels||[]) for(const w of level.walls||[]) {
    if(wallLength(w)<0.25) warnings.push(`${w.id} is shorter than 250 mm and may be drafting noise.`);
    for(const o of w.openings||[]) if(o.offsetAlongWall - o.width/2 < -0.01 || o.offsetAlongWall + o.width/2 > wallLength(w)+0.01) errors.push(`${o.id} is outside host wall ${w.id}.`);
  }
  if(!d.titleBlock?.project) warnings.push('Title block project name is missing.');
  return {valid:errors.length===0,errors,warnings};
}

export function phase9Manifest(building) {
  normalizeDrafting(building);
  return { schema:PHASE9_SCHEMA, generatedAt:new Date().toISOString(), project:building.name||'ARCHVISION PROJECT', drafting:building.documentation.drafting, views:building.documentation.views||[], sheets:building.documentation.sheets||[] };
}

export function printCss() { return '@page{size:A1 landscape;margin:10mm}'; }
