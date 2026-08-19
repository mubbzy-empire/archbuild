# ArchVision Professional — Phase 13

## Associative Authoring, Versioning & Construction Takeoff

Phase 13 introduces the authoring-control layer above the canonical Building IR.

### Added
- `archvision-bim-1.3` schema.
- Dependency graph between walls, openings, rooms, stairs, dimensions and tags.
- Associative propagation records for model edits.
- Transaction records for model changes.
- Design checkpoints / model versions with restore support.
- Wall endpoint/grip editing helper with opening clamping.
- Deterministic construction takeoff for wall length/area/volume, openings, floors and roof area.
- Phase 13 authoring QA.
- Phase 13 JSON manifest export.
- Professional Modeler `AUTHOR` panel.

### Design principle
The canonical Building IR remains authoritative. AI, documentation, quantities and BIM exports consume the model rather than independently inventing project facts.

### Verification
- TypeScript parser diagnostics for `ProfessionalModeler.jsx`: 0.
- Node syntax validation for frontend JavaScript: passed.
- Phase 13 integration test: passed.
- Model version restore: passed.
- Wall grip edit + opening clamping: passed.
- Phase 13 QA: 0 errors / 0 warnings on the test model.
