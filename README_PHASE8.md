# ArchVision Professional — Phase 8

Phase 8 advances the canonical Building IR into an associative architectural documentation and editing layer.

## Included
- Associative wall/opening/room constraints.
- Hosted opening metadata that survives wall edits and clamps to valid wall returns.
- Parametric wall edit helpers: edit, offset, trim and extend.
- Model-derived wall/opening dimensions and room/door/window/wall tags.
- Model-derived plan/elevation/section view definitions.
- Drawing-sheet definitions with architectural and MEP sheets.
- Door swing annotation geometry and roof-edge reference geometry.
- Phase 8 QA for hosted openings, documentation views/sheets and MEP routes.
- Phase 8 production/BIM manifest (`archvision-bim-0.8`).

## Architectural intent
The application continues to use one canonical Building IR for Chat, Blueprint, Estate and manual authoring. Documentation is regenerated from that model instead of being independent drawing data.

## Verification
- Node syntax validation: all `.js` files pass.
- Phase 8 integration test: valid model, 8 views, 6 sheets, 36 dimensions, 49 tags, 49 constraints.
- Full Vite build was not run because dependency installation may be unavailable in the sandbox.
