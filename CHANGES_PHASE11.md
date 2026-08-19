# ArchVision Professional — Phase 11

Phase 11 establishes BIM interoperability and model intelligence.

## Added
- IFC4 STEP export from the canonical Building IR.
- IFC spatial hierarchy: project → site → building → storeys.
- Semantic IFC classes for walls, spaces, doors/windows, columns, beams and slabs.
- IFC property sets for architectural quantities and references.
- Deterministic 22-character IFC-style GlobalId generation.
- Model index for queryable building elements.
- Model queries for element type, IFC class, level and text.
- Coordination clash detection for architectural/structural elements.
- Phase 11 BIM manifest and QA.
- Professional Modeler BIM 1.1 panel with queries, coordination and IFC export.

## Important scope boundary
The IFC exporter contains semantic entities and simplified parametric wall geometry. It is intended as a real exchange starting point, not a certification claim. Professional users should validate exported IFC files in their target BIM platform before relying on them for contractual or permit workflows.
