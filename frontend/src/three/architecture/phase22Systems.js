// Phase 22 — wall/room/space topology and associative room regeneration.
// The canonical Building IR remains authoritative. This module derives closed
// architectural spaces from connected wall centerlines and records ownership,
// adjacency and downstream ceiling/slab relationships.
export const PHASE22_SCHEMA = 'archvision-bim-1.12';
const EPS = 0.08;
const now = () => new Date().toISOString();
const clone = v => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const key = p => `${Math.round(p[0]/EPS)}:${Math.round(p[1]/EPS)}`;
const area = pts => Math.abs(pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-q[0]*p[1]},0))/2;
const centroid = pts => { let a=0,cx=0,cz=0; for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],f=p[0]*q[1]-q[0]*p[1];a+=f;cx+=(p[0]+q[0])*f;cz+=(p[1]+q[1])*f;} if(Math.abs(a)<1e-9)return pts.reduce((s,p)=>[s[0]+p[0]/pts.length,s[1]+p[1]/pts.length],[0,0]); return [cx/(3*a),cz/(3*a)]; };
const pointInPoly=(p,pts)=>{let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j],hit=((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1]+1e-12)+a[0]);if(hit)inside=!inside;}return inside;};
function angle(a,b){return Math.atan2(b[1]-a[1],b[0]-a[0]);}
function graphFaces(walls){
  const vertices=new Map(), edges=[];
  const vertex=(p)=>{const k=key(p);if(!vertices.has(k))vertices.set(k,{key:k,p:[p[0],p[1]],out:[]});return vertices.get(k)};
  for(const w of walls){const a=vertex(w.start),b=vertex(w.end);if(a.key===b.key)continue;const e={id:`${w.id}:ab`,wallId:w.id,a,b,from:a,to:b,used:false};const r={id:`${w.id}:ba`,wallId:w.id,a:b,b:a,from:b,to:a,used:false};e.rev=r;r.rev=e;a.out.push(e);b.out.push(r);edges.push(e,r);}
  for(const v of vertices.values())v.out.sort((a,b)=>angle(a.from.p,a.to.p)-angle(b.from.p,b.to.p));
  const faces=[];
  for(const start of edges){if(start.used)continue;let e=start,pts=[],wallIds=[],guard=0;while(e&&!e.used&&guard++<edges.length+4){e.used=true;pts.push(e.from.p);wallIds.push(e.wallId);const outs=e.to.out;const ri=outs.indexOf(e.rev);e=outs[(ri-1+outs.length)%outs.length];if(e===start)break;}if(e===start&&pts.length>=3){const signed=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2;if(signed>0&&signed>0.25)faces.push({polygon:pts,wallIds:[...new Set(wallIds)],area:Math.abs(signed)});}}
  return faces;
}
function openingPoint(w,o){const len=dist(w.start,w.end);const t=Math.max(0,Math.min(1,(Number(o.offsetAlongWall)||len/2)/Math.max(len,1e-9)));return [w.start[0]+(w.end[0]-w.start[0])*t,w.start[1]+(w.end[1]-w.start[1])*t];}

export function normalizePhase22(building){
  building.metadata ||= {}; building.metadata.schema=PHASE22_SCHEMA;
  building.phase22 ||= {};
  building.phase22.schema=PHASE22_SCHEMA;
  building.phase22.spaceTopology ||= {rooms:[],adjacency:[],wallOwnership:[],operations:0,lastRegenerated:null};
  for(const l of building.levels||[]){l.spaceTopology ||= {rooms:[],adjacency:[],wallEdges:[]};}
  return building;
}

export function regenerateRoomsFromTopology22(building,{preserveNames=true}={}){
  normalizePhase22(building); const allRooms=[]; const allAdj=[];
  for(const level of building.levels||[]){
    const old=level.rooms||[]; const faces=graphFaces(level.walls||[]).filter(f=>f.area>=0.75);
    const next=[]; const usedOld=new Set();
    for(const f of faces){const c=centroid(f.polygon); let match=null,best=Infinity; if(preserveNames) for(const r of old){if(usedOld.has(r.id)||!r.polygon?.length)continue;const rc=centroid(r.polygon);const d=dist(c,rc);if(pointInPoly(c,r.polygon)||d<best){best=d;match=r;}} if(match)usedOld.add(match.id);
      const id=match?.id||`room-f${level.index}-${next.length+1}`; const room={...(match?clone(match):{id,name:`Room ${next.length+1}`,type:'generic',floor:level.index}),id,floor:level.index,polygon:f.polygon.map(p=>[Number(p[0].toFixed(4)),Number(p[1].toFixed(4))]),areaM2:Number(f.area.toFixed(3)),centroid:[Number(c[0].toFixed(3)),Number(c[1].toFixed(3))],boundaryWallIds:f.wallIds,topologySource:'phase22-wall-cycle',topologyUpdatedAt:now()};
      room.ceilingRelation={roomId:id,level:level.index,boundary:clone(room.polygon),updatePolicy:'follow-room-boundary'};
      room.slabRelation={roomId:id,level:level.index,boundary:clone(room.polygon),updatePolicy:'follow-room-boundary'};
      next.push(room); allRooms.push({level:level.index,id,wallIds:f.wallIds,centroid:c});
    }
    level.rooms=next; level.spaceTopology.rooms=next.map(r=>({id:r.id,areaM2:r.areaM2,wallIds:r.boundaryWallIds,centroid:r.centroid}));
    level.spaceTopology.wallEdges=(level.walls||[]).map(w=>({wallId:w.id,roomIds:next.filter(r=>r.boundaryWallIds?.includes(w.id)).map(r=>r.id)}));
    // A hosted opening whose center lies on a room boundary connects the two
    // spaces that contain points just to either side of the wall.
    for(const w of level.walls||[]) for(const o of w.openings||[]){const p=openingPoint(w,o),dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],len=Math.hypot(dx,dz)||1,n=[-dz/len,dx/len],eps=0.06;const a=next.find(r=>pointInPoly([p[0]+n[0]*eps,p[1]+n[1]*eps],r.polygon)),b=next.find(r=>pointInPoly([p[0]-n[0]*eps,p[1]-n[1]*eps],r.polygon));if(a&&b&&a.id!==b.id)allAdj.push({id:`adj:${a.id}:${b.id}:${o.id}`,level:level.index,from:a.id,to:b.id,openingId:o.id,wallId:w.id,type:o.type==='door'?'door':'opening'});}
    level.spaceTopology.adjacency=allAdj.filter(a=>a.level===level.index);
  }
  building.phase22.spaceTopology.rooms=allRooms; building.phase22.spaceTopology.adjacency=allAdj; building.phase22.spaceTopology.wallOwnership=allRooms.flatMap(r=>r.wallIds.map(w=>({wallId:w,level:r.level,roomId:r.id})));
  building.phase22.spaceTopology.operations=(building.phase22.spaceTopology.operations||0)+1; building.phase22.spaceTopology.lastRegenerated=now();
  return building;
}

export function phase22AssociativeUpdate(building,reason='model-change'){
  normalizePhase22(building); regenerateRoomsFromTopology22(building);
  building.phase22.associative={reason,updatedAt:now(),rooms:building.phase22.spaceTopology.rooms.length,adjacencies:building.phase22.spaceTopology.adjacency.length,ceilingBindings:building.phase22.spaceTopology.rooms.length,slabBindings:building.phase22.spaceTopology.rooms.length};
  return building;
}

export function phase22Manifest(building){normalizePhase22(building);return {schema:PHASE22_SCHEMA,project:{id:building.id,name:building.name},spaceTopology:clone(building.phase22.spaceTopology),associative:clone(building.phase22.associative||{}),notes:['Phase 22 derives editable architectural spaces from connected wall topology.','Room, ceiling and slab relationships are model-derived design data; engineering approval remains a professional responsibility.']};}

export function validatePhase22(building){normalizePhase22(building);const errors=[],warnings=[];for(const l of building.levels||[]){for(const r of l.rooms||[]){if(!r.polygon||r.polygon.length<3)errors.push(`Room ${r.id} has no closed boundary.`);if(Number(r.areaM2||0)<0.75)warnings.push(`Room ${r.id} is smaller than 0.75 m².`);for(const w of r.boundaryWallIds||[])if(!(l.walls||[]).some(x=>x.id===w))errors.push(`Room ${r.id} references missing wall ${w}.`);}for(const w of l.walls||[]){const owners=(l.spaceTopology?.wallEdges||[]).find(x=>x.wallId===w.id)?.roomIds||[];if(owners.length===0)warnings.push(`Wall ${w.id} does not bound a detected room.`);if(owners.length>2)errors.push(`Wall ${w.id} bounds more than two detected rooms.`);}}if(!building.phase22.associative?.updatedAt)warnings.push('Phase 22 space topology has not been regenerated.');return {valid:errors.length===0,errors,warnings};}
