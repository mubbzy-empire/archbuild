# ArchVision Professional — Phase 7

Phase 7 concentrates on the architectural geometry core and production QA.

## New systems
- `phase7Systems.js`: deterministic wall offset/trim/extend rules, miter/butt join analysis, opening-family normalization, stair production checks, roof-plane schedules, production manifest and Phase 7 QA.
- `phase7Geometry.js`: 3D guardrail/handrail geometry derived from stair data.
- `geometryBuilder.js`: Phase 7 normalization/production data and production geometry are now part of the canonical Building IR → geometry pipeline.
- `ProfessionalModeler.jsx`: new Geometry production panel with wall joins, opening families, roof planes, stair checks, QA and manifest export.

## Architectural intent
Phase 7 does not claim code compliance or certified structural engineering. It creates deterministic model data and geometry that can be reviewed and refined by an architect/engineer.

## Validation
- All JavaScript source files pass `node --check`.
- `test-phase7.mjs` validates wall join detection, roof plane schedules, stair production calculation, manifest generation and trim/miter helpers.
- Frontend dependency installation/build was not run in the sandbox because the npm registry was unavailable; this is not represented as a successful production build.
