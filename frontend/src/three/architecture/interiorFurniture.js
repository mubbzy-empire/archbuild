import * as THREE from 'three';
import { interiorMaterial } from './materialSystem.js';

const box = (group, size, pos, mat, name = 'furniture') => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.03,size[0]), Math.max(.03,size[1]), Math.max(.03,size[2])), mat);
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = true; m.receiveShadow = true;
  m.userData.group = 'interior'; m.userData.room = group.userData.room; m.userData.floor = group.userData.floor; m.userData.furniture = name;
  group.add(m); return m;
};

function roomBounds(room) {
  const p = room.polygon || [];
  const xs = p.map(v => v?.[0]).filter(Number.isFinite), zs = p.map(v => v?.[1]).filter(Number.isFinite);
  if (xs.length < 3 || zs.length < 3) return null;
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs), cx: (Math.min(...xs)+Math.max(...xs))/2, cz: (Math.min(...zs)+Math.max(...zs))/2 };
}

export function buildInteriorFurniture(room, level) {
  const b = roomBounds(room);
  if (!b) return new THREE.Group();
  const g = new THREE.Group();
  g.name = `furniture_${room.id}`;
  g.userData.group = 'interior'; g.userData.room = room.name; g.userData.floor = level.index;
  const y = level.elevation;
  const wood = interiorMaterial('wood', '#8b6b4b');
  const fabric = interiorMaterial('fabric', '#c9c2b8');
  const white = interiorMaterial('plaster', '#e9e5dd');
  const metal = interiorMaterial('metal', '#73777a');
  const glass = interiorMaterial('glass', '#b8d4dc');
  const w = b.maxX-b.minX, d = b.maxZ-b.minZ;

  if (room.type === 'bedroom') {
    const bedW = Math.min(1.8, Math.max(1.2, w*.55)), bedD = Math.min(2.0, Math.max(1.7, d*.42));
    const bx = b.cx, bz = b.minZ + Math.min(d*.38, 1.5);
    box(g,[bedW,.28,bedD],[bx,y+.28,bz],wood,'bed frame');
    box(g,[bedW-.08,.16,bedD-.1],[bx,y+.48,bz],fabric,'mattress');
    box(g,[bedW*.35,.12,.38],[bx-bedW*.22,y+.62,bz-bedD*.28],white,'pillow');
    box(g,[bedW*.35,.12,.38],[bx+bedW*.22,y+.62,bz-bedD*.28],white,'pillow');
    box(g,[.42,.5,.42],[Math.min(b.maxX-.25,bx+bedW*.62),y+.25,bz-bedD*.05],wood,'nightstand');
    box(g,[.34,.06,.34],[Math.min(b.maxX-.25,bx+bedW*.62),y+.53,bz-bedD*.05],glass,'lamp');
  } else if (room.type === 'living' || room.type === 'lounge') {
    const sofaW=Math.min(2.6,Math.max(1.5,w*.58));
    box(g,[sofaW,.42,.78],[b.cx,b.minZ+.95,y+.42],fabric,'sofa');
    box(g,[.78,.42,.78],[b.minX+.55,b.cz,y+.42],fabric,'accent chair');
    box(g,[Math.min(1.4,w*.4),.18,.72],[b.cx,b.cz,y+.18],wood,'coffee table');
    box(g,[.65,.06,.65],[b.cx,b.cz,y+.29],glass,'table top');
  } else if (room.type === 'dining') {
    const tw=Math.min(2.0,Math.max(1.2,w*.55)), td=Math.min(1.1,Math.max(.8,d*.35));
    box(g,[tw,.08,td],[b.cx,b.cz,y+.78],wood,'dining table');
    for (const [dx,dz] of [[-tw*.35,-td*.8],[tw*.35,-td*.8],[-tw*.35,td*.8],[tw*.35,td*.8]]) box(g,[.42,.45,.42],[b.cx+dx,b.cz+dz,y+.28],fabric,'dining chair');
  } else if (room.type === 'kitchen') {
    const counterD=Math.min(.7,d*.22), counterW=Math.min(w*.82,2.8);
    box(g,[counterW,.9,counterD],[b.cx,b.minZ+counterD/2+.25,y+.45],wood,'kitchen counter');
    box(g,[counterW-.12,.04,counterD-.1],[b.cx,b.minZ+counterD/2+.25,y+.93],glass,'countertop');
    box(g,[Math.min(1.8,w*.45),.9,.65],[b.cx,b.cz,y+.45],wood,'kitchen island');
    box(g,[.55,.9,.08],[b.cx,b.cz,y+.93],metal,'sink/cooktop');
  } else if (room.type === 'bathroom') {
    box(g,[.7,.38,.7],[b.cx,b.minZ+.65,y+.19],white,'vanity');
    box(g,[.42,.06,.25],[b.cx,b.minZ+.65,y+.41],glass,'basin');
    const toiletX=Math.min(b.maxX-.45,b.cx+.55);
    box(g,[.48,.42,.62],[toiletX,b.cz,y+.21],white,'toilet');
    const showerW=Math.min(.95,w*.42), showerD=Math.min(.95,d*.34);
    box(g,[showerW,.04,showerD],[b.minX+showerW/2+.12,b.maxZ-showerD/2-.12,y+.02],glass,'shower tray');
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.7,8),metal); rail.rotation.z=Math.PI/2; rail.position.set(b.minX+.2,b.maxZ-.2,y+1.8); rail.userData={group:'interior',room:room.name,floor:level.index,furniture:'shower rail'}; g.add(rail);
  } else if (room.type === 'foyer' || room.type === 'corridor' || room.type === 'store') {
    box(g,[Math.min(.9,w*.55),.45,.35],[b.cx,b.cz,y+.23],wood,'console');
    box(g,[.35,.8,.35],[b.minX+.35,b.cz,y+.4],fabric,'accent');
  }
  return g;
}
