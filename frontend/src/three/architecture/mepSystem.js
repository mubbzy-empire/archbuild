import * as THREE from 'three';

const COLORS = {
  electrical: 0xf3c74f,
  plumbingSupply: 0x3d9be9,
  plumbingDrain: 0x6d6f78,
  hvac: 0x63c5c8,
  fire: 0xe45d5d,
};

function line(points, color, y, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92, linewidth: 2 });
  const l = new THREE.Line(geometry, material);
  l.userData.discipline = 'mep';
  l.userData.mepLine = true;
  if (dashed) material.dashSize = 0.15;
  return l;
}

function marker(x, y, z, color, shape = 'circle') {
  const geo = shape === 'square' ? new THREE.BoxGeometry(0.12, 0.05, 0.12) : new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  if (shape !== 'square') mesh.rotation.x = Math.PI / 2;
  mesh.userData.discipline = 'mep';
  mesh.userData.mepMarker = true;
  return mesh;
}

function roomCenter(room) {
  const pts = room.polygon || [];
  if (!pts.length) return [0, 0];
  const sum = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

export function buildMepGroup(building) {
  const root = new THREE.Group();
  root.name = 'mep_systems';
  root.userData.discipline = 'mep';
  const systems = building.systems || {};
  const electrical = new THREE.Group(); electrical.name = 'Electrical'; electrical.userData.discipline = 'electrical';
  const plumbing = new THREE.Group(); plumbing.name = 'Plumbing'; plumbing.userData.discipline = 'plumbing';
  const hvac = new THREE.Group(); hvac.name = 'HVAC'; hvac.userData.discipline = 'hvac';
  const fire = new THREE.Group(); fire.name = 'Fire'; fire.userData.discipline = 'fire';

  building.levels.forEach(level => {
    const rooms = level.rooms || [];
    const elev = level.elevation;
    const floorY = elev + 0.16;
    const ceilingY = elev + level.height - 0.12;
    const centers = rooms.map(r => ({ room: r, c: roomCenter(r) }));

    // Electrical: a simple ring/branch layout with one light and one outlet per room.
    const panelRoom = centers.find(x => /foyer|corridor|hall/i.test(x.room.name)) || centers[0];
    if (panelRoom) electrical.add(marker(panelRoom.c[0], floorY + 0.02, panelRoom.c[1], COLORS.electrical, 'square'));
    centers.forEach(({ room, c }) => {
      electrical.add(marker(c[0], ceilingY, c[1], COLORS.electrical));
      const branch = panelRoom ? [panelRoom.c, c] : [c, c];
      electrical.add(line(branch, COLORS.electrical, ceilingY));
      electrical.add(marker(c[0] + 0.55, floorY + 0.02, c[1], COLORS.electrical));
    });

    // Plumbing: connect wet rooms to a vertical service spine.
    const wet = centers.filter(({ room }) => /toilet|bath|kitchen|laundry/i.test(room.name));
    const wetSpine = wet[0] || panelRoom;
    if (wetSpine) wet.forEach(({ c }) => {
      plumbing.add(line([wetSpine.c, c], COLORS.plumbingSupply, floorY + 0.03));
      plumbing.add(line([c, [c[0] + 0.35, c[1]]], COLORS.plumbingDrain, floorY + 0.04));
      plumbing.add(marker(c[0], floorY + 0.04, c[1], COLORS.plumbingSupply));
    });

    // HVAC: one diffuser per major occupied room and a short branch from corridor.
    const occupied = centers.filter(({ room }) => !/garage|store|bath|toilet/i.test(room.name));
    const hvacHub = centers.find(({ room }) => /corridor|hall|lounge/i.test(room.name)) || occupied[0];
    if (hvacHub) occupied.forEach(({ c }) => {
      hvac.add(line([hvacHub.c, c], COLORS.hvac, ceilingY - 0.03));
      hvac.add(marker(c[0], ceilingY - 0.02, c[1], COLORS.hvac));
    });

    // Fire: smoke/heat detector in each room, with corridor detector priority.
    centers.forEach(({ c }) => fire.add(marker(c[0], ceilingY + 0.01, c[1], COLORS.fire)));
  });


  // Vertical coordination: one repeatable service riser is derived from the
  // wet-room stack rather than floating independently on each floor.
  const firstRooms = building.levels[0]?.rooms || [];
  const serviceRoom = firstRooms.find(r => /bath|toilet|kitchen|laundry/i.test(r.name)) || firstRooms[0];
  if (serviceRoom) {
    const [rx, rz] = roomCenter(serviceRoom);
    const topY = Math.max(...building.levels.map(l => l.elevation + l.height));
    const pipeH = Math.max(0.1, topY - (building.levels[0]?.elevation || 0));
    const supply = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,pipeH,10), new THREE.MeshBasicMaterial({color:COLORS.plumbingSupply}));
    supply.position.set(rx, pipeH/2, rz); supply.userData.discipline='plumbing'; supply.userData.mepRiser=true; plumbing.add(supply);
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,pipeH,10), new THREE.MeshBasicMaterial({color:COLORS.plumbingDrain}));
    drain.position.set(rx+0.12, pipeH/2, rz); drain.userData.discipline='plumbing'; drain.userData.mepRiser=true; plumbing.add(drain);
    building.levels.forEach(level => plumbing.add(marker(rx, level.elevation + 0.2, rz, COLORS.plumbingSupply, 'square')));
  }
  // Service equipment intent: DB/panel, water tank and HVAC outdoor unit are
  // represented explicitly so coordination survives into the 3D model.
  const equipment = building.metadata?.mepEquipment || {};
  if (building.levels[0]?.rooms?.length) {
    const c = roomCenter(building.levels[0].rooms.find(r=>/foyer|corridor|hall/i.test(r.name)) || building.levels[0].rooms[0]);
    electrical.add(marker(c[0]-0.45, building.levels[0].elevation+1.35, c[1], COLORS.electrical, 'square'));
  }
  if (equipment.waterTank || systems.plumbing?.waterTank) {
    const top = building.levels.at(-1); const c = roomCenter(top.rooms?.find(r=>/service|store|bath|kitchen/i.test(r.name)) || top.rooms?.[0] || {polygon:[[0,0]]});
    plumbing.add(marker(c[0], top.elevation+top.height+0.25, c[1], COLORS.plumbingSupply, 'square'));
  }
  if (equipment.hvacOutdoor || systems.hvac?.outdoorUnit) {
    const ground = building.levels[0]; const c = roomCenter(ground.rooms?.[0] || {polygon:[[0,0]]});
    hvac.add(marker(c[0]+1.0, ground.elevation+0.6, c[1], COLORS.hvac, 'square'));
  }

  root.add(electrical, plumbing, hvac, fire);
  return root;
}
