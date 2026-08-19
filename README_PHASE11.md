# Phase 11 — BIM Interoperability & Coordination

ArchVision now treats the Building IR as the project single source of truth for semantic BIM export, model queries and coordination checks.

### Export
Open Professional Modeler → BIM 1.1 → **Export IFC4 · .ifc**.

### Queries
Use the BIM 1.1 panel to query walls, spaces, or text matches. Query results are stored in the project model for traceability.

### Coordination
Run clash detection to find intersecting architectural/structural bounding volumes on the same level. These are coordination warnings, not structural-engineering determinations.
