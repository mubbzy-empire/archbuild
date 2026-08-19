# ArchVision Professional — Phase 20

## Direct 3D Architectural Authoring

Phase 20 adds direct 3D architectural authoring primitives to the canonical Building IR.

### Authoring operations
- Move an exterior or interior wall face in metric units.
- Change wall thickness while preserving an architectural face.
- Resize a hosted door/window.
- Move a hosted door/window along its wall.
- Record deterministic change impact and authoring history.
- Export a Phase 20 authoring manifest.

### Model invariants
- The Building IR remains the source of truth.
- Door/window hosting is preserved and normalized after edits.
- Opening sizes and positions are clamped to the host wall.
- Operations remain compatible with the existing transaction/undo system.
- Phase 20 QA reports invalid authored wall/opening states.

## Important limitation
These are CAD/BIM authoring primitives, not structural engineering calculations or construction approval. Professional review remains required before construction use.
