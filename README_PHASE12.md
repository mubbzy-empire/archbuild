# Phase 12 — Construction BIM

Run the project from the root as before. The Professional Modeler now exposes a **CONSTRUCTION** inspector panel.

Phase 12 is generated from the same Building IR used by Chat, Blueprint, Estate and Manual CAD.

## New model data

`building.phase12` contains:
- `assemblies`
- `wallLayers`
- `openingDetails`
- `stairDetails`
- `roofFraming`
- `mepFittings`
- `associative`
- `coordination`

## Validation

`node test-phase12.mjs`

The test creates a two-storey architectural model and validates wall assemblies, openings, stairs, roof framing, MEP fittings and coordination.
