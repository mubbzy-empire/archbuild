# ArchVision Professional — Phase 5

Phase 5 deepens the BIM/CAD core instead of adding cosmetic features.

## BIM / architectural authoring
- Professional wall-joint metadata and junction classification.
- Opening families now carry family, frame, leaf-count, reveal and glazing intent.
- Foundation geometry is tied directly to architectural walls and structural columns.
- Ceiling grids are generated from actual room boundaries.
- Roof plane schedules are derived from the top-level footprint and roof definition.

## Documentation / coordination
- Building IR now carries documentation and structural design-intent sections.
- Site coordination shows plot boundary, setback envelope and estate-road intent.
- Discipline route geometry supports explicit electrical, plumbing, drainage, HVAC and fire routes.
- Existing model-derived plans, sections, elevations, schedules and QA remain in place.

## Geometry architecture
- The geometry builder remains the single deterministic path from canonical Building IR to Three.js.
- AI remains a design-intent producer; it does not directly author arbitrary mesh geometry.
- New systems are optional and defensive so older saved Building IR files continue to normalize.

## Scope note
This remains an architectural authoring/design-intent system, not a substitute for structural engineering calculations, MEP sizing, local building-code review or permit approval.

## BIM interoperability foundation
- Stable project/element identifiers and BIM class metadata.
- Material assemblies for standard wall, floor and roof constructions.
- Exportable BIM interoperability manifest for downstream IFC/BIM work.
