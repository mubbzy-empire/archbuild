export const PHASE27_SCHEMA = 'archvision-bim-1.17';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const area = p => Math.abs((p||[]).reduce((s,a,i,pts)=>{const b=pts[(i+1)%pts.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2;
const openings = b => (b.levels||[]).flatMap(l=>(l.walls||[]).flatMap(w=>(w.openings||[]).map(o=>({...o,level:l.index,wallId:w.id}))));
const rooms = b => (b.levels||[]).flatMap(l=>(l.rooms||[]).map(r=>({...r,level:l.index})));

export function normalizePhase27(building){
  building.metadata ||= {}; building.metadata.schema = PHASE27_SCHEMA;
  building.phase27 ||= {};
  const p=building.phase27;
  p.schema=PHASE27_SCHEMA;
  p.settings ||= {paper:'A1',scale:'1:100',discipline:'Architectural',status:'PRELIMINARY',revision:'P01'};
  p.views ||= []; p.sheets ||= []; p.annotations ||= []; p.schedules ||= {}; p.revisions ||= [];
  p.operations ||= 0; p.updatedAt ||= null; p.associative ||= {};
  return building;
}

function view(id,name,type,level,scale='1:100',discipline='Architectural'){
  return {id,name,type,level,scale,discipline,modelDerived:true,visible:true};
}
function dimensionCount(b){return (b.documentation?.dimensions||[]).length || (b.phase9?.dimensions||[]).length || 0;}
function makeViews(b){
  const vs=[];
  (b.levels||[]).forEach(l=>vs.push(view(`A-F${l.index}-PLAN`,`F${l.index} Floor Plan`,'plan',l.index)));
  vs.push(view('A-101-SITE','Site / Estate Plan','site',0,'1:200'));
  vs.push(view('A-201-ROOF','Roof Plan','roof',null,'1:100'));
  vs.push(view('A-301-RCP','Reflected Ceiling Plan','rcp',null,'1:100'));
  vs.push(view('A-401-ELEV','Elevations','elevation',null,'1:100'));
  vs.push(view('A-501-SEC-A','Building Section A-A','section','A','1:100'));
  vs.push(view('A-502-SEC-B','Building Section B-B','section','B','1:100'));
  return vs;
}
function makeAnnotations(b){
  const a=[];
  (b.levels||[]).forEach(l=>{
    (l.rooms||[]).forEach(r=>a.push({id:`RT-${r.id}`,type:'room-tag',level:l.index,elementId:r.id,text:r.name||'ROOM',areaM2:area(r.polygon)}));
    (l.walls||[]).forEach(w=>(w.openings||[]).forEach(o=>a.push({id:`OT-${o.id}`,type:'opening-tag',level:l.index,elementId:o.id,text:o.type?.includes('window')?'W':'D'})));
  });
  return a;
}
function makeSchedules(b){
  const os=openings(b), rs=rooms(b);
  return {
    doors:os.filter(o=>String(o.type).includes('door')).map((o,i)=>({mark:`D${i+1}`,id:o.id,type:o.familyLabel||o.family||o.type,width:o.width,height:o.height,level:o.level,hostWall:o.wallId})),
    windows:os.filter(o=>String(o.type).includes('window')).map((o,i)=>({mark:`W${i+1}`,id:o.id,type:o.familyLabel||o.family||o.type,width:o.width,height:o.height,sillHeight:o.sillHeight||0,level:o.level,hostWall:o.wallId})),
    rooms:rs.map((r,i)=>({mark:`R${i+1}`,id:r.id,name:r.name||'ROOM',areaM2:Number(area(r.polygon).toFixed(2)),level:r.level,finish:r.finish||'TBD'})),
    materials:(b.phase26?.items||[]).map(i=>({key:i.key,name:i.name,quantity:i.grossQuantity,unit:i.unit}))
  };
}
function makeSheets(b,views){
  const sheets=[
    {number:'G-001',title:'Cover / General Notes',viewIds:[],status:'PRELIMINARY'},
    {number:'A-101',title:'Site / Ground Floor Plan',viewIds:views.filter(v=>v.type==='site'||(v.type==='plan'&&v.level===1)).map(v=>v.id),status:'PRELIMINARY'},
    {number:'A-102',title:'Upper Floor Plan',viewIds:views.filter(v=>v.type==='plan'&&v.level===2).map(v=>v.id),status:'PRELIMINARY'},
    {number:'A-201',title:'Roof & Reflected Ceiling Plans',viewIds:views.filter(v=>v.type==='roof'||v.type==='rcp').map(v=>v.id),status:'PRELIMINARY'},
    {number:'A-301',title:'Elevations',viewIds:views.filter(v=>v.type==='elevation').map(v=>v.id),status:'PRELIMINARY'},
    {number:'A-401',title:'Sections',viewIds:views.filter(v=>v.type==='section').map(v=>v.id),status:'PRELIMINARY'},
    {number:'A-501',title:'Schedules / Materials',viewIds:[],status:'PRELIMINARY'}
  ];
  return sheets.map(s=>({...s,paper:'A1',scale:'1:100',project:b.name||'ARCHVISION PROJECT',revision:'P01',issueDate:now().slice(0,10),titleBlock:{project:b.name||'ARCHVISION PROJECT',drawingNumber:s.number,revision:'P01',status:s.status}}));
}

export function regeneratePhase27(building,reason='phase27-documentation-regeneration'){
  normalizePhase27(building); const p=building.phase27;
  p.views=makeViews(building); p.annotations=makeAnnotations(building); p.schedules=makeSchedules(building); p.sheets=makeSheets(building,p.views);
  p.revisions.push({revision:p.settings.revision,status:p.settings.status,date:now(),reason});
  p.operations++; p.updatedAt=now();
  p.associative={modelDerived:true,viewCount:p.views.length,sheetCount:p.sheets.length,annotationCount:p.annotations.length,dimensionCount:dimensionCount(building)};
  return building;
}
export function validatePhase27(building){
  normalizePhase27(building); const p=building.phase27,errors=[],warnings=[];
  if(!p.views.length) errors.push('No production drawing views generated.');
  if(!p.sheets.length) errors.push('No production drawing sheets generated.');
  const ids=new Set(); for(const s of p.sheets){if(!s.number)errors.push('Drawing sheet without drawing number.'); if(ids.has(s.number))errors.push(`Duplicate drawing number ${s.number}.`); ids.add(s.number);}
  if(!p.schedules.doors)warnings.push('Door schedule not generated.');
  if(!p.updatedAt)warnings.push('Documentation has not been regenerated.');
  return {valid:errors.length===0,errors,warnings};
}
export function phase27Manifest(building){normalizePhase27(building);return {schema:PHASE27_SCHEMA,project:{id:building.id,name:building.name},settings:clone(building.phase27.settings),views:clone(building.phase27.views),sheets:clone(building.phase27.sheets),annotations:clone(building.phase27.annotations),schedules:clone(building.phase27.schedules),revisions:clone(building.phase27.revisions),notes:['Phase 27 drawings are model-derived production documentation.','Drawing scales, annotations, dimensions and issue status require professional review before construction use.']};}
export function setPhase27Settings(building,patch={}){normalizePhase27(building);building.phase27.settings={...building.phase27.settings,...patch};return regeneratePhase27(building,'documentation settings updated');}
