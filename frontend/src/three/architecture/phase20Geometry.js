import * as THREE from 'three';
import { wallLength, wallAngle } from './buildingModel.js';

function handle(material){ const m=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,.025),material); m.castShadow=false; m.receiveShadow=false; return m; }
export function buildPhase20AuthoringHandles(building){
  const root=new THREE.Group(); root.name='phase20_authoring_handles'; root.userData.group='phase20'; root.visible=false;
  const wallMat=new THREE.MeshBasicMaterial({color:0xd7a35c});
  const openMat=new THREE.MeshBasicMaterial({color:0x7bb8ff});
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    const len=wallLength(wall); if(len<.1)continue; const a=new THREE.Group(); a.userData={phase20Handle:'wall-face',wallId:wall.id,floor:level.index}; a.position.set((wall.start[0]+wall.end[0])/2,wall.baseElevation+wall.height/2,(wall.start[1]+wall.end[1])/2); a.rotation.y=wallAngle(wall); const e=handle(wallMat); e.position.z=wall.thickness/2; const i=handle(wallMat); i.position.z=-wall.thickness/2; a.add(e,i); root.add(a);
    for(const o of wall.openings||[]){ const g=new THREE.Group(); g.userData={phase20Handle:'opening',openingId:o.id,wallId:wall.id,floor:level.index}; const off=Math.min(Math.max(o.offsetAlongWall,o.width/2+.05),Math.max(len-o.width/2-.05,o.width/2+.05)); const ux=(wall.end[0]-wall.start[0])/len,uz=(wall.end[1]-wall.start[1])/len; g.position.set(wall.start[0]+ux*off,wall.baseElevation+o.sillHeight+o.height/2,wall.start[1]+uz*off); g.rotation.y=wallAngle(wall); const l=handle(openMat); l.position.x=-o.width/2; const r=handle(openMat); r.position.x=o.width/2; g.add(l,r); root.add(g); }
  }
  return root;
}
