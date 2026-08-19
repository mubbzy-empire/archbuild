# Phase 18 — Direct 3D Authoring

Phase 18 adds direct manipulation to the Professional Modeler.

### 3D editing
1. Open the Professional Modeler.
2. Switch to `3D`.
3. Select a wall or architectural component.
4. Use the 3D gizmo to move it.
5. Components can also use Rotate mode.
6. Changes are committed back to the Building IR and participate in the existing history/associative workflow.

Doors and windows remain hosted by their wall. Moving a wall therefore moves the canonical wall and its hosted opening relationships together on regeneration.

### Construction views
- Architectural
- Construction
- Structure
- MEP

These are coordination/display modes, not engineering analysis.

### Validation
Use `test-phase18.mjs` to validate the deterministic Phase 18 authoring system.
