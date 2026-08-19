# ArchVision Professional — Phase 28

## Advanced 2D CAD & Drafting Standards

Schema: `archvision-bim-1.18`

Phase 28 adds a structured 2D drafting database to the canonical Building IR. It does not replace earlier documentation or CAD behavior.

### Added
- Metric CAD drafting database
- Architectural drafting layers with lineweight/linetype/visibility/plot metadata
- Drafting styles for dimensions, text, linework and annotations
- Object snapping to wall endpoints/midpoints plus metric grid fallback
- Ortho mode
- Active drafting layer
- CAD line creation
- Polyline creation
- Circle/arc creation foundation
- Text annotation creation
- Dimension creation with precision control
- 2D plan rendering for Phase 28 entities
- CAD database regeneration and manifest export
- Phase 28 QA

### Professional intent
The drafting layer is model-adjacent and associative: it is stored in the project model and regenerated as part of the existing transaction pipeline. Construction issue drawings still require professional review and jurisdiction/project-specific drafting standards.
