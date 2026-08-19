# Phase 26 QTO specification

## Quantity rules

- Wall net area = wall length × wall height − hosted opening area.
- Area-based assembly layers use net face area.
- Volume-based layers use net face area × layer thickness.
- Floor quantities use model-derived room polygon area.
- Roof quantities use model-derived roof plane area when available.
- Ceiling quantities use model-derived room area.
- Door frames use opening perimeter.
- Window glazing uses opening width × height.
- Window frames use opening perimeter.
- Gross quantity = net quantity × (1 + waste rate).

These rules are intentionally explicit and deterministic so the QTO can be audited and later replaced/extended with project-specific measurement rules.
