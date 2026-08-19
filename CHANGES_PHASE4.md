# ArchVision Professional — Phase 4

Phase 4 moves the workbench toward BIM/CAD-grade architectural behavior while keeping the canonical Building IR as the single source of truth.

## Production modeling
- Added deterministic wall-network solving: endpoint cleanup and true segment splitting at wall intersections.
- Preserves hosted opening relationships when a wall is split.
- Added room-boundary regeneration from closed wall coverage for simple orthogonal plans.
- Added architectural grid generation from the actual footprint.
- Added overall dimension-chain generation from the actual footprint.

## Stairs
- Rebuilt stair calculation around actual floor-to-floor rise.
- Riser count is derived from the target riser height.
- Tread depth and the 2R+G comfort check are reported.
- Straight, L-shaped and U-shaped flights now use calculated risers and landings.
- Stair QA warns when the generated geometry deserves code review.

## Documentation
- Elevations now use actual wall facade projection and hosted opening dimensions.
- Sections now derive from actual walls, rooms, slabs and openings along an X/Z cut.
- Added section axis/cut controls to the professional QA/documentation panel.
- Added model-derived documentation language and scale/date metadata to the drawing sheet.
- Added controls to regenerate dimensions and architectural grids.

## MEP coordination
- Added vertical plumbing supply/drain riser intent across storeys.
- Added explicit service equipment intent for electrical panel, water tank and HVAC outdoor unit.
- Existing electrical, plumbing, HVAC and fire overlays remain intact.

## QA / robustness
- Validation now checks disconnected wall endpoints.
- Validation checks stair comfort geometry.
- Building normalization now tolerates missing walls/rooms/components/openings in imported AI/blueprint data.
- Geometry builder runs the wall-network solver before generating Three.js geometry.

## Scope note
This phase is still not a permit-grade BIM authoring system or structural-code engine. Structural sizing, local code compliance, MEP sizing and construction approval remain professional engineering tasks and require jurisdiction-specific validation.
