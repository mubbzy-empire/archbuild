export const PHASE28_SCHEMA = 'archvision-bim-1.18';
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const DEFAULT_LAYERS = [
  ['A-WALL','Walls','Continuous',0.50,true,false],['A-DOOR','Doors / Windows','Continuous',0.25,true,false],
  ['A-DIMS','Dimensions','Continuous',0.18,true,false],['A-ANNO','Annotations','Continuous',0.18,true,false],
  ['A-GRID','Grid / Datums','CENTER',0.13,true,false],['A-OVER','Overhead','DASHED',0.13,true,false],
  ['A-HIDN','Hidden','DASHED',0.13,true,false],['A-SITE','Site / Estate','Continuous',0.18,true,false],
  ['S-STRUCT','Structure','Continuous',0.35,true,false],['M-MEP','MEP','Continuous',0.18,true,false],
  ['A-CONS','Construction','Continuous',0.13,true,false],
];
const DEFAULT_STYLES = {
  dimension:{name:'Architectural Metric',unit:'m',precision:2,textHeight:0.10,arrowSize:0.12,offset:0.25},
  text:{name:'Architectural Notes',textHeight:0.10,font:'Sans',lineSpacing:1.2},
  line:{name:'Architectural Linework',defaultLayer:'A-WALL'},
  annotation:{name:'Architectural Annotation',textHeight:0.10},
};
export function normalizePhase28(building){
  building.metadata ||= {}; building.metadata.schema = PHASE28_SCHEMA;
  building.phase28 ||= {};
  const p=building.phase28; p.schema=PHASE28_SCHEMA;
  p.settings ||= {units:'metric',precision:2,annotationScale:'1:100',activeLayer:'A-WALL',ortho:false,polar:false,osnap:true};
  p.layers ||= Object.fromEntries(DEFAULT_LAYERS.map(([id,name,linetype,lineweight,visible,locked])=>[id,{id,name,linetype,lineweight,visible,locked,plot:true}]));
  p.styles ||= clone(DEFAULT_STYLES);
  p.entities ||= []; p.selection ||= []; p.operations ||= 0; p.updatedAt ||= null; p.lastCommand ||= null; p.snapHistory ||= [];
  syncLegacyDrafting(building); return building;
}
function syncLegacyDrafting(b){
  b.documentation ||= {};
  const p=b.phase28;
  for(const line of b.documentation.lines||[]) if(!p.entities.some(e=>e.id===line.id)) p.entities.push({id:line.id,type:'line',layer:line.layer||'A-WALL',a:line.a,b:line.b,level:line.level||1});
  for(const d of b.documentation.dimensions||[]) if(!p.entities.some(e=>e.id===d.id)) p.entities.push({id:d.id,type:'dimension',layer:d.layer||'A-DIMS',a:d.a,b:d.b,value:d.value,level:d.level||1,text:d.text});
  for(const n of b.documentation.notes||[]) if(!p.entities.some(e=>e.id===n.id)) p.entities.push({id:n.id,type:'text',layer:n.layer||'A-ANNO',position:n.position,level:n.level||1,text:n.text});
}
export function createDraftEntity(building, entity){normalizePhase28(building); const e={id:entity.id||`CAD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,layer:building.phase28.settings.activeLayer,...entity}; building.phase28.entities.push(e); syncLegacyDrafting(building); building.phase28.operations++; building.phase28.lastCommand=e.type; building.phase28.updatedAt=now(); return e;}
export function setPhase28Settings(building,patch={}){normalizePhase28(building); building.phase28.settings={...building.phase28.settings,...patch}; building.phase28.operations++; building.phase28.updatedAt=now(); return building;}
export function setPhase28Layer(building,patch={}){normalizePhase28(building); const {id,...rest}=patch; if(!id||!building.phase28.layers[id]) return building; building.phase28.layers[id]={...building.phase28.layers[id],...rest}; building.phase28.updatedAt=now(); return building;}
export function addPhase28Layer(building,{id,name,linetype='Continuous',lineweight=0.18}={}){normalizePhase28(building); if(!id||building.phase28.layers[id]) return null; building.phase28.layers[id]={id,name:name||id,linetype,lineweight,visible:true,locked:false,plot:true}; building.phase28.updatedAt=now(); return building.phase28.layers[id];}
export function snapPhase28Point(building,point,{step=0.1,levelIndex=1,mode='nearest'}={}){normalizePhase28(building); let p=[Number(point?.[0])||0,Number(point?.[1])||0], source='free'; if(building.phase28.settings.osnap && mode!=='grid'){
  let best=null; for(const w of (building.levels.find(l=>l.index===levelIndex)?.walls||[])){for(const q of [w.start,w.end,[(w.start[0]+w.end[0])/2,(w.start[1]+w.end[1])/2]]){const d=Math.hypot(p[0]-q[0],p[1]-q[1]); if(!best||d<best.d)best={q,d};}}
  if(best&&best.d<0.25){p=[best.q[0],best.q[1]];source='object';}
 }
 if(source==='free'||mode==='grid'){p=[Math.round(p[0]/step)*step,Math.round(p[1]/step)*step]; if(source==='free')source='grid';}
 if(building.phase28.settings.ortho){p=[Math.abs(p[0])>Math.abs(p[1])?p[0]:0,Math.abs(p[0])>Math.abs(p[1])?0:p[1]]; source='ortho';}
 building.phase28.snapHistory.push({point:p,source,at:now()}); building.phase28.snapHistory=building.phase28.snapHistory.slice(-100); return {point:p,source};}
export function deleteDraftEntity(building,id){normalizePhase28(building); building.phase28.entities=building.phase28.entities.filter(e=>e.id!==id); if(building.documentation){building.documentation.lines=(building.documentation.lines||[]).filter(e=>e.id!==id);building.documentation.dimensions=(building.documentation.dimensions||[]).filter(e=>e.id!==id);building.documentation.notes=(building.documentation.notes||[]).filter(e=>e.id!==id);} building.phase28.operations++; building.phase28.lastCommand='erase'; building.phase28.updatedAt=now(); return building;}
export function updateDraftEntity(building,id,patch={}){normalizePhase28(building); const e=building.phase28.entities.find(x=>x.id===id); if(!e)return null; Object.assign(e,patch); building.phase28.operations++; building.phase28.lastCommand='modify'; building.phase28.updatedAt=now(); return e;}
export function regeneratePhase28(building,reason='phase28-drafting-regeneration'){normalizePhase28(building); syncLegacyDrafting(building); const p=building.phase28; p.associative={modelDerived:true,entityCount:p.entities.length,layerCount:Object.keys(p.layers).length,dimensionCount:p.entities.filter(e=>e.type==='dimension').length,annotationCount:p.entities.filter(e=>e.type==='text').length}; p.lastCommand=reason; p.updatedAt=now(); return building;}
export function validatePhase28(building){normalizePhase28(building);const p=building.phase28,errors=[],warnings=[]; if(!p.layers['A-WALL'])errors.push('A-WALL drafting layer is missing.'); if(!p.layers['A-DIMS'])errors.push('A-DIMS drafting layer is missing.'); const ids=new Set(); for(const e of p.entities){if(!e.id)errors.push('Drafting entity without ID.'); if(ids.has(e.id))errors.push(`Duplicate drafting entity ${e.id}.`); ids.add(e.id); if(e.layer&&!p.layers[e.layer])warnings.push(`Entity ${e.id} references missing layer ${e.layer}.`); if(e.type==='dimension'&&!Number.isFinite(Number(e.value)))warnings.push(`Dimension ${e.id} has no numeric value.`);} if(!p.updatedAt)warnings.push('Drafting database has not been regenerated.'); return {valid:errors.length===0,errors,warnings};}
export function phase28Manifest(building){normalizePhase28(building);return {schema:PHASE28_SCHEMA,settings:clone(building.phase28.settings),layers:clone(building.phase28.layers),styles:clone(building.phase28.styles),entities:clone(building.phase28.entities),associative:clone(building.phase28.associative||{}),snapHistory:clone(building.phase28.snapHistory||[]),notes:['Phase 28 provides a metric architectural drafting layer. Drawing geometry and annotations require professional review before construction issue.']};}
