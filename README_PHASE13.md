# Phase 13 — Professional Authoring Layer

Phase 13 is the next layer of ArchVision's professional modeler. It does not replace the Building IR; it makes the IR behave more like a single source of truth for downstream architectural information.

## Main capabilities

### Associative dependency graph
Tracks relationships such as:
- wall → hosted opening
- wall → room boundary
- level → stair
- model element → dimension/tag

### Transactions and checkpoints
Edits can be recorded as transactions and design checkpoints can be created/restored without losing the current version history.

### Authoring geometry helper
`moveWallGrip()` supports endpoint or whole-wall movement and clamps hosted openings back into the valid wall range.

### Construction takeoff
Deterministically derives wall gross/net area, wall volume, floor area, opening counts/areas and roof area from the model.

## Professional warning
Phase 13 is a design-authoring and coordination system. Quantities and geometry are not construction certification or engineering approval and must be reviewed by qualified professionals.
