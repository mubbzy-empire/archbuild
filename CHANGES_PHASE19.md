# ArchVision Professional — Phase 19

## Advanced 3D architectural families

Phase 19 adds configurable architectural opening families and face-aware wall authoring metadata while keeping the canonical Building IR as the single source of truth.

### Added
- `archvision-bim-1.9` schema.
- Configurable door families: single, double, sliding, garage.
- Configurable window families: casement, fixed, awning, louvre.
- Opening family data, 3D detail metadata and plan-symbol metadata.
- Host-wall/host-level normalization for openings.
- Wall face geometry metadata with exterior/interior offsets.
- Advanced 3D opening detail geometry derived from the canonical model.
- Hidden wall-face authoring guides for future direct face manipulation.
- Professional Modeler `3D FAMILIES 1.9` panel.
- Phase 19 QA and manifest export.

### Design principle
AI and UI operations modify the canonical Building IR. Three.js geometry is regenerated from that model; it is not an independent authoring database.

### Validation
- Phase 19 system integration test: passed.
- Phase 19 QA: 0 errors / 0 warnings on the integration fixture.
- Node syntax checks: passed for Phase 19 modules and geometry builder.
- TypeScript JSX parser check: passed for `ProfessionalModeler.jsx`.

A complete Vite/browser build was not claimed because frontend dependencies are not installed in the sandbox.
