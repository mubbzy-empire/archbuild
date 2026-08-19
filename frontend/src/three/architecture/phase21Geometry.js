import * as THREE from 'three';
import { wallLength, wallAngle } from './buildingModel.js';
import { deriveLayerSolids21 } from './phase21Systems.js';

function matFor(name){
  const m=new THREE.MeshStandardMaterial({color:0xd9d9d9,roughness:.78,metalness:0});
  m.name=`construction:${name}`;
  return m;
}
export function buildPhase21LayeredWallGroup(building){
  const root=new THREE.Group(); root.name='phase21_layered_wall_solids'; root.userData.group='phase21';
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    const len=wallLength(wall); if(len<.1) continue;
    const layers=deriveLayerSolids21(wall);
    let offset=-layers.reduce((s,l)=>s+l.thickness,0)/2;
    const angle=Math.atan2(wall.end[1]-wall.start[1],wall.end[0]-wall.start[0]);
    layers.forEach((layer,i)=>{
      const t=Math.max(.005,layer.thickness);
      const g=new THREE.Mesh(new THREE.BoxGeometry(len,wall.height,t),matFor(layer.material));
      g.position.set((wall.start[0]+wall.end[0])/2,wall.baseElevation+wall.height/2,(wall.start[1]+wall.end[1])/2);
      g.rotation.y=-angle;
      const n=[-(wall.end[1]-wall.start[1])/len,(wall.end[0]-wall.start[0])/len];
      const center=offset+t/2;
      g.position.x+=n[0]*center; g.position.z+=n[1]*center;
      g.userData={group:'phase21',floor:level.index,wallId:wall.id,layerId:layer.id,constructionLayer:true};
      g.castShadow=true; g.receiveShadow=true; root.add(g); offset+=t;
    });
  }
  return root;
}

export function buildPhase21FaceHandles(building){
  const root=new THREE.Group(); root.name='phase21_face_handles'; root.userData.group='phase21'; root.visible=false;
  const material=new THREE.MeshBasicMaterial({color:0xf0b44c});
  for(const level of building.levels||[]) for(const wall of level.walls||[]){
    const len=wallLength(wall); if(len<.1)continue;
    const a=new THREE.Group(); a.userData={phase21Handle:'wall-face',wallId:wall.id,floor:level.index};
    a.position.set((wall.start[0]+wall.end[0])/2,wall.baseElevation+wall.height/2,(wall.start[1]+wall.end[1])/2);
    a.rotation.y=-Math.atan2(wall.end[1]-wall.start[1],wall.end[0]-wall.start[0]);
    for(const side of [-1,1]){
      const h=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.18,Math.min(1,len*.08)),.12,.05),material);
      h.position.z=side*wall.thickness/2; h.userData={phase21Handle:'face',side:side===1?'exterior':'interior',wallId:wall.id,floor:level.index}; a.add(h);
    }
    root.add(a);
  }
  return root;
}
