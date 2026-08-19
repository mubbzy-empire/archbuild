# ArchVision Professional — Phase 26

Phase 26 adds model-derived construction materials, layered assemblies and professional quantity takeoff (QTO).

## Core flow

`Canonical Building IR → construction assemblies → material quantities → waste-adjusted gross quantities → schedules/manifests`

## Included
- External/internal wall assemblies with material layers
- Floor build-up quantities
- Roof build-up quantities
- Ceiling finish quantities
- Door/window glazing and frame quantities
- Material catalog with units and default waste assumptions
- Net and gross quantities
- Model-derived element takeoff
- Assembly takeoff records
- Associative regeneration after model edits
- Professional Modeler Materials 2.6 panel
- JSON takeoff manifest export

## Verification

Run:

```bash
node test-phase26.mjs
```

The test checks schema, material lines, assembly rows, floor/wall/roof quantities, opening counts, waste-adjusted quantities and QA.

## Important

Quantities are deterministic design-stage estimates. Waste factors are assumptions and should be reviewed against specifications, measurement rules and procurement practice. This feature is not a certified bill of quantities or cost estimate.
