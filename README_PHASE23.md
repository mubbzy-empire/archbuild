# ArchVision Professional — Phase 23

## Advanced Space Topology & Circulation

Phase 23 (`archvision-bim-1.13`) extends Phase 22's room derivation into a planar wall arrangement engine that understands:

- T-junctions and wall endpoints that land on another wall
- Shared partitions and multiple rooms on one level
- Door/opening-based room adjacency
- Multi-level vertical space links through stairs
- Model-derived room ownership and ceiling/slab boundary bindings
- Topology diagnostics and deterministic QA

### Canonical model rule
Spaces are derived from the canonical Building IR. The AI is not the authority for areas, connectivity, or ownership.

### Engineering boundary
The topology and circulation data is deterministic design/coordination information. It is not a substitute for professional architectural, structural, fire/life-safety, accessibility, or MEP review.

## Verification

`node test-phase23.mjs` verifies a two-storey plan with a shared partition, a door adjacency, and a stair-based vertical connection. The test also verifies that T-junction splitting creates four spaces with 16 m² each.

Frontend npm/Vite production build was not claimed in the sandbox because dependencies are not reliably installed there.
