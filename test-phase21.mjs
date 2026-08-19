// Phase 21 integration test entry point.
// Run from frontend after dependencies are installed:
// node ../test-phase21.mjs
import { normalizePhase21, moveWallFace21, cleanupWallTopology21, validatePhase21 } from './frontend/src/three/architecture/phase21Systems.js';

const building = {
  id:'phase21-test', name:'Phase 21 Test', levels:[{index:0,baseElevation:0,height:3,walls:[
    {id:'W1',start:[0,0],end:[6,0],thickness:.20,height:3,baseElevation:0,openings:[]},
    {id:'W2',start:[6,0],end:[6,4],thickness:.20,height:3,baseElevation:0,openings:[]}
  ]}]
};
normalizePhase21(building);
moveWallFace21(building,{levelIndex:0,wallId:'W1',face:'exterior',distance:.10});
cleanupWallTopology21(building,0);
const qa=validatePhase21(building);
if(!qa.valid) throw new Error(qa.errors.join('\n'));
console.log(JSON.stringify({schema:building.metadata.schema, thickness:building.levels[0].walls[0].thickness, joins:building.phase21.topology.joins.length, qa},null,2));
