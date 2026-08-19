# ArchVision Professional — Phase 25

## Connected MEP & Coordination

Phase 25 introduces a model-derived connected MEP coordination layer for electrical, plumbing, HVAC and fire/life-safety intent.

### Added
- `archvision-bim-1.15` schema.
- Connected MEP networks and routes.
- Electrical distribution board and vertical riser intent.
- Lighting circuits and socket/device records.
- Plumbing supply and soil/waste risers, fixtures and routes.
- HVAC air-handler/diffuser branches.
- Fire detection device records.
- Route fittings (elbows/tees) and equipment metadata.
- Wall and slab penetration requirements.
- Deterministic route/wall coordination clash checks.
- Dedicated Phase 25 3D MEP geometry group.
- Professional Modeler `MEP 2.5` panel.
- Phase 25 manifest export and QA.

### Professional boundary
The MEP layer is design-intent coordination data. It is not a substitute for licensed electrical, plumbing, HVAC, fire or code engineering.

### Validation
The Phase 25 integration test passes with zero errors and zero warnings.
