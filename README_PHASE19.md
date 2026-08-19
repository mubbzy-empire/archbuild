# ArchVision Professional — Phase 19

Phase 19 advances the 3D authoring layer with configurable architectural component families and face-aware wall metadata.

## Main modules
- `frontend/src/three/architecture/phase19Systems.js`
- `frontend/src/three/architecture/phase19Geometry.js`
- `frontend/src/three/architecture/geometryBuilder.js`
- `frontend/src/pages/ProfessionalModeler.jsx`
- `test-phase19.mjs`

## Professional workflow
Select a door/window and open **3D FAMILIES 1.9** to change its family. Select a wall to apply exterior/interior face offsets. These edits are written to the canonical Building IR and are regenerated into the 3D scene.
