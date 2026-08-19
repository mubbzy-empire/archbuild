import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('./frontend/src/three/architecture/phase27Systems.js',import.meta.url),'utf8');
const code=src.replace(/export /g,'');
const sandbox={}; vm.createContext(sandbox); vm.runInContext(code+';globalThis.api={normalizePhase27,regeneratePhase27,validatePhase27,phase27Manifest,PHASE27_SCHEMA};',sandbox);
const b={id:'T27',name:'Phase 27 Test',levels:[{index:1,walls:[{id:'W1',start:[0,0],end:[10,0],openings:[{id:'D1',type:'door',width:0.9,height:2.1}]}],rooms:[{id:'R1',name:'Living',polygon:[[0,0],[10,0],[10,5],[0,5]]}]}],documentation:{dimensions:[{id:'DIM1'}]},phase26:{items:[{key:'MAT1',name:'Concrete',grossQuantity:10,unit:'m3'}]}};
sandbox.api.regeneratePhase27(b,'test'); const q=sandbox.api.validatePhase27(b); if(!q.valid) throw new Error(q.errors.join('; ')); const m=sandbox.api.phase27Manifest(b); if(m.sheets.length<5||m.views.length<5) throw new Error('Insufficient production docs'); console.log(JSON.stringify({schema:sandbox.api.PHASE27_SCHEMA,views:m.views.length,sheets:m.sheets.length,annotations:m.annotations.length,doors:m.schedules.doors.length,errors:q.errors.length,warnings:q.warnings.length},null,2));
