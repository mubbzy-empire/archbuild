import * as THREE from 'three';
import { interiorMaterial, frameMaterial } from './materialSystem.js';
import { stairCalculation } from './professionalGeometry.js';

function makeStep(width, depth, height, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y - height / 2, z); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.group = 'stair'; return mesh;
}

function makeRail(start, end, height, material) {
  const dx=end[0]-start[0], dy=end[1]-start[1], dz=end[2]-start[2];
  const len=Math.hypot(dx,dy,dz); const mesh=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,len,10),material);
  mesh.position.set((start[0]+end[0])/2,(start[1]+end[1])/2,(start[2]+end[2])/2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx,dy,dz).normalize());
  mesh.userData.group='stair'; return mesh;
}

export function buildStairGroup(stair, fromLevel, toLevel) {
  const group=new THREE.Group(); group.name=`stair_${stair.id}`; group.userData.group='stair'; group.userData.stairId=stair.id;
  const calc=stairCalculation(stair,fromLevel,toLevel); if(calc.rise<=0) return group;
  const width=stair.width||1.1, tread=calc.treadDepth, riser=calc.riserHeight, n=calc.risers;
  const mat=interiorMaterial(stair.material||'tile','#e2ddd3'), railMat=frameMaterial(stair.railMaterial||'aluminium');
  const flight=(count, origin, dir, startIndex=0)=>{
    const g=new THREE.Group();
    for(let i=0;i<count;i++){
      const idx=startIndex+i, d=(idx+0.5)*tread;
      const x=origin[0]+dir[0]*d, z=origin[1]+dir[1]*d, y=fromLevel.elevation+riser*(idx+1);
      g.add(makeStep(width,tread,riser,x,y,z,mat));
    }
    const last=(count-1)*tread+tread/2;
    const railBaseY=fromLevel.elevation+riser*(startIndex+1);
    g.add(makeRail([origin[0]-dir[1]*(width/2-0.08),railBaseY,origin[1]+dir[0]*(width/2-0.08)], [origin[0]+dir[0]*last-dir[1]*(width/2-0.08), railBaseY+riser*(count-1)+0.9, origin[1]+dir[1]*last+dir[0]*(width/2-0.08)],0.9,railMat));
    return g;
  };
  if(stair.type==='straight'){
    group.add(flight(n,[0,0],[0,-1]));
  } else if(stair.type==='u-shaped'){
    const first=Math.ceil(n/2), second=n-first, landingDepth=width;
    group.add(flight(first,[0,0],[0,-1],0));
    const landingY=fromLevel.elevation+riser*first;
    const landing=new THREE.Mesh(new THREE.BoxGeometry(width,0.12,landingDepth),mat); landing.position.set(0,landingY-0.06,-first*tread-landingDepth/2); landing.userData.group='stair'; group.add(landing);
    const secondG=flight(second,[0,-first*tread-landingDepth],[0,1],first); group.add(secondG);
  } else {
    const first=Math.ceil(n/2), second=n-first, landingSize=width;
    group.add(flight(first,[0,0],[0,-1],0));
    const landingY=fromLevel.elevation+riser*first;
    const landing=new THREE.Mesh(new THREE.BoxGeometry(landingSize,0.12,landingSize),mat); landing.position.set(width/2,landingY-0.06,-first*tread-landingSize/2); landing.userData.group='stair'; group.add(landing);
    const secondG=flight(second,[width/2,-first*tread-landingSize/2],[1,0],first); group.add(secondG);
  }
  group.position.set(stair.position?.[0]||0,0,stair.position?.[1]||0); group.rotation.y=stair.rotation||0;
  group.userData.risers=calc.risers; group.userData.riserHeight=calc.riserHeight; group.userData.treadDepth=calc.treadDepth; group.userData.run=calc.run;
  return group;
}
