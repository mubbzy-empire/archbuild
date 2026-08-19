import * as THREE from 'three';
import { wallLength, wallAngle } from './buildingModel.js';
import { frameMaterial, glazingMaterial, doorMaterial } from './materialSystem.js';

function bar(w,h,d,mat){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.castShadow=true; m.receiveShadow=true; return m; }
function addOpeningDetail(group,wall,o){
  const len=wallLength(wall); const off=Math.min(Math.max(o.offsetAlongWall,o.width/2+.05),Math.max(len-o.width/2-.05,o.width/2+.05));
  const ux=(wall.end[0]-wall.start[0])/len, uz=(wall.end[1]-wall.start[1])/len;
  const cx=wall.start[0]+ux*off, cz=wall.start[1]+uz*off, y=wall.baseElevation+o.sillHeight+o.height/2;
  const rot=wallAngle(wall); const g=new THREE.Group(); g.position.set(cx,y,cz); g.rotation.y=rot; g.userData.group=o.type==='window'?'window':'door'; g.userData.openingId=o.id; g.userData.floor=wall.floor; g.userData.phase19=true;
  const fw=Math.max(.045,o.reveal||.06), depth=Math.max(.04,wall.thickness*.95); const fm=frameMaterial(o.frameMaterial||'aluminium');
  g.add(bar(o.width,fw,depth,fm)); g.add(bar(o.width,fw,depth,fm));
  const side=bar(fw,o.height,depth,fm); side.position.x=-o.width/2+fw/2; g.add(side); const side2=side.clone(); side2.position.x=o.width/2-fw/2; g.add(side2);
  if(o.type==='window'){
    const glass=bar(Math.max(.04,o.width-2*fw),Math.max(.04,o.height-2*fw),depth*.25,glazingMaterial()); glass.position.z=0; g.add(glass);
    const family=o.family||'casement';
    if(family==='casement' || family==='louvre') { const mull=bar(.035,o.height-2*fw,depth*1.1,fm); mull.position.x=0; g.add(mull); }
    if(family==='casement' || family==='awning') { const trans=bar(o.width-2*fw,.035,depth*1.1,fm); trans.position.y=0; g.add(trans); }
    const sill=bar(o.width+.12,.06,wall.thickness+.14,frameMaterial('stone','#d8d3c6')); sill.position.y=-o.height/2-.03; g.add(sill);
  } else {
    const isSliding=o.family==='sliding'||o.type==='sliding-door'; const isGarage=o.family==='garage'||o.type==='garage-door';
    const mat=doorMaterial(isGarage?'garage':'wood');
    const leaf=bar(Math.max(.05,o.width*.94),Math.max(.05,o.height*.96),.05,mat); leaf.position.z=.025; g.add(leaf);
    if(isSliding){ const line=bar(.04,o.height-.08,.06,fm); line.position.x=0; g.add(line); }
    if(isGarage){ for(let i=1;i<4;i++){ const line=bar(o.width*.94,.025,.07,fm); line.position.y=-o.height/2+o.height*i/4; g.add(line); } }
    if(!isSliding&&!isGarage){ const hinge=o.swing==='left'?-1:1; const handle=new THREE.Mesh(new THREE.SphereGeometry(.022,8,8),fm); handle.position.set(hinge*o.width*.35,0,.06); g.add(handle); }
    const threshold=bar(o.width,.03,wall.thickness+.06,frameMaterial('stone','#c9c4b6')); threshold.position.y=-o.height/2-.015; g.add(threshold);
  }
  group.add(g);
}

export function buildPhase19ComponentDetailGroup(building){
  const root=new THREE.Group(); root.name='phase19_component_details'; root.userData.group='phase19'; root.userData.discipline='architecture';
  for(const level of building.levels||[]) for(const wall of level.walls||[]) for(const opening of wall.openings||[]) addOpeningDetail(root,wall,opening);
  return root;
}

export function buildPhase19WallFaceGuides(building){
  const root=new THREE.Group(); root.name='phase19_wall_face_guides'; root.userData.group='phase19'; root.visible=false;
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    const len=wallLength(wall); if(len<.02) continue; const rot=wallAngle(wall); const mx=(wall.start[0]+wall.end[0])/2,mz=(wall.start[1]+wall.end[1])/2;
    const g=new THREE.Group(); g.position.set(mx,wall.baseElevation+wall.height/2,mz); g.rotation.y=rot; g.userData.wallId=wall.id; g.userData.floor=level.index;
    const face=wall.faceGeometry||{}; const ext=Number(face.exteriorOffset)||0, int=Number(face.interiorOffset)||0;
    const e=bar(len,.015,.015,new THREE.MeshBasicMaterial({color:0xb58a55})); e.position.z=wall.thickness/2+ext; const i=e.clone(); i.position.z=-wall.thickness/2-int; g.add(e,i); root.add(g);
  }
  return root;
}
