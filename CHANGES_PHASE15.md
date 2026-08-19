# ArchVision Professional — Phase 15

## Associative Model Engine

Phase 15 establishes deterministic change-impact propagation and regeneration across the canonical Building IR.

### Added
- `phase15Systems.js`
- BIM schema `archvision-bim-1.5`
- Change-impact traversal through the Phase 13 dependency graph
- Associative opening host normalization
- Room area/level regeneration
- Documentation associative metadata refresh
- Model regeneration counters and impact history
- Phase 15 QA and manifest export
- Professional Modeler `ASSOCIATE` panel
- Interactive wall/opening edits now trigger Phase 15 regeneration

### Design principle
The canonical Building IR remains authoritative. Downstream documentation, quantities and coordination data should be regenerated from the model rather than independently authored by the AI.
