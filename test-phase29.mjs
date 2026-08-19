import fs from 'node:fs'; import vm from 'node:vm';
const src=fs.readFileSync(new URL('./frontend/src/three/architecture/phase29Systems.js',import.meta.url),'utf8').replace(/export /g,'');
const sandbox={}; vm.createContext(sandbox);
vm.runInContext(src+';globalThis.api={createPhase29Reconstruction,updatePhase29Review,compilePhase29Candidate,validatePhase29,phase29Manifest,PHASE29_SCHEMA};',sandbox);
const detected={
  floors:1,
  scale:{source:'dimension',referenceLengthMeters:3.6,referenceLengthDrawingUnits:3.6,confidence:0.96,requiresReview:false},
  rooms:[{name:'Living Room',floor:1,confidence:.96}],
  uncertain:[],
  geometry:{
    units:'meters',
    walls:[
      {id:'W1',level:1,start:[0,0],end:[8,0],thicknessMeters:.2,type:'exterior',confidence:.98,requiresReview:true},
      {id:'W2',level:1,start:[8,0],end:[8,6],thicknessMeters:.2,type:'exterior',confidence:.98,requiresReview:true},
      {id:'W3',level:1,start:[8,6],end:[0,6],thicknessMeters:.2,type:'exterior',confidence:.98,requiresReview:true},
      {id:'W4',level:1,start:[0,6],end:[0,0],thicknessMeters:.2,type:'exterior',confidence:.98,requiresReview:true}
    ],
    rooms:[{id:'R1',name:'Living Room',level:1,polygon:[[0,0],[8,0],[8,6],[0,6]],confidence:.95,requiresReview:true}],
    openings:[{id:'O1',hostWallId:'W1',type:'door',offsetAlongWall:3,widthMeters:1,heightMeters:2.1,level:1,confidence:.94,requiresReview:true}]
  }
};
const r=sandbox.api.createPhase29Reconstruction(detected,{type:'blueprint',fileName:'test.png'});
let q=sandbox.api.validatePhase29(r); if(!q.valid) throw new Error(q.errors.join('; '));
for(const e of r.entities) sandbox.api.updatePhase29Review(r,{id:e.id,status:'accepted'});
const c=sandbox.api.compilePhase29Candidate(r); if(!c.eligible) throw new Error(c.reason);
if(c.candidateBuilding.levels[0].walls.length!==4) throw new Error('candidate wall count mismatch');
const m=sandbox.api.phase29Manifest(r);
console.log(JSON.stringify({schema:sandbox.api.PHASE29_SCHEMA,entities:m.entityCounts,walls:c.candidateBuilding.levels[0].walls.length,rooms:c.candidateBuilding.levels[0].rooms.length,eligible:c.eligible,errors:q.errors.length,warnings:q.warnings.length},null,2));