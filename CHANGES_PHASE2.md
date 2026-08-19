# ArchVision Professional — Phase 2

Phase 2 moves the professional workbench from a visual prototype toward an architectural production workflow while keeping the Phase 1 canonical Building IR intact.

## Professional model editing

- Exact wall start/end coordinates in the inspector.
- Exact wall thickness, height and hosted-opening editing.
- Exact door/window offset, width, height and sill editing.
- Exact component X/Y/Z, width/height/depth and rotation editing.
- Room creation by two-point rectangle.
- Wall, room, component and opening selection.
- Move, Copy, Rotate and Mirror X/Z operations.
- Undo/redo history increased to 50 edits.
- Metric snap controls: 50 / 100 / 250 / 500 mm.

## Architectural documentation

- Associative 2D dimensions stored in the Building IR documentation layer.
- Construction lines.
- Text notes.
- Section markers.
- Elevation markers.
- Detail markers.
- Room tags.
- Drawing-set metadata.
- Room schedule and door/window schedule export.
- Building IR JSON export.

## Site / estate

- Site mode in the professional modeler.
- Plot boundary visibility.
- Front/rear/left/right setback visibility in project information.
- One-click return to the site plan.
- Estate remains a separate workflow and is not collapsed into the building model.

## QA / reliability

- Model QA panel is available from the workbench.
- Existing structural validation and auto-repair remain the gate before geometry generation.
- Openings continue to be hosted by walls rather than free-floating geometry.
- Three.js selection now recognizes walls, openings, rooms and components.

## MEP / construction coordination

The existing electrical, plumbing, HVAC and fire/life-safety design-intent systems remain visible as discipline overlays and in the project information panel.

## AI / source workflow

The workbench continues to consume the canonical Building IR produced by Chat → 3D and Blueprint → 3D. Phase 2 does not introduce a second geometry representation.
