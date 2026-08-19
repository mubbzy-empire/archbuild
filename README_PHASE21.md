# ArchVision Professional — Phase 21

Phase 21 adds face-aware architectural wall geometry and deterministic wall-topology authoring on top of the canonical Building IR.

## Highlights
- `archvision-bim-1.11` schema
- Face-aware exterior/interior wall movement
- Wall thickness changes derived from face movement
- Wall join classification and topology records
- Endpoint cleanup for near-coincident wall joins
- Construction-layer solids derived from wall assembly layers
- 3D face authoring handles
- Phase 21 QA and manifest export
- Integrated with the existing Professional Modeler and geometry builder

The Building IR remains the authoritative model. The Phase 21 3D layer is derived from it.

## Validation
- Node syntax validation passed for Phase 21 modules and geometry builder.
- JSX source integration was inspected after the new Phase 21 panel/imports were added.
- Full Vite build was not claimed because frontend dependencies are unavailable in the sandbox environment.
