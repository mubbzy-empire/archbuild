# ArchVision Professional — Phase 16

Phase 16 is the **Professional Geometry Authoring** phase.

The primary goal is to make architectural geometry directly editable through deterministic CAD operations while preserving the Building IR as the single source of truth.

## Main capabilities

- Wall offset
- Wall trim
- Wall extend
- Wall join cleanup
- Construction-layer wall solids
- Opening-aware wall editing
- Associative geometry impact tracking
- Phase 16 QA
- Phase 16 manifest export

## Modeler

Open `/modeler` and use the command strip:

- **Offset + / Offset −** — offsets the selected wall by the entered distance.
- **Trim** — select a wall, activate Trim, then click a target wall.
- **Extend** — select a wall, activate Extend, then click a target wall.
- **Join / Clean Walls** — existing wall solver remains available.

The `GEOM 1.6` inspector exposes operation state, wall-layer mode, QA, regeneration and manifest export.

## Geometry architecture

The canonical flow remains:

`Chat / Blueprint / Estate / Manual CAD → Building IR → Phase 16 geometry authoring → deterministic 3D/documentation/BIM`

Layered wall solids use the construction assemblies introduced in Phase 12. Openings are subtracted through each layer so the construction model remains geometrically coherent.

## Validation

Run:

```bash
node test-phase16.mjs
```

The test covers offset, trim, extend, join cleanup, associative regeneration and QA.
