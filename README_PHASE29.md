# ArchVision Professional — Phase 29

## Blueprint → Professional BIM Reconstruction

Schema: `archvision-bim-1.19`

Phase 29 upgrades blueprint analysis from a descriptive "what the AI saw" response into a conservative reconstruction pipeline.

### Core principle

**Vision evidence → confidence → human review → metric calibration → BIM compilation**

The vision layer is not allowed to silently invent geometry. Detected walls, rooms and openings carry confidence, source references and review state. Non-metric or uncertain geometry blocks BIM compilation until the architect reviews/calibrates it.

### Added

- Phase 29 reconstruction schema
- Explicit scale evidence and calibration state
- Confidence scoring for walls, rooms and openings
- Source-reference tracking
- Review states: accept / reject / review-required
- Conservative metric-only BIM compiler
- Candidate Building IR generation after review
- Reconstruction manifest export
- Blueprint review panel on Results
- Phase 29 panel in Professional Modeler
- PDF blueprint upload support
- Expanded AI blueprint geometry contract
- Phase 29 validation and integration test

### AI contract

The blueprint vision prompt now requests:

- scale evidence
- wall segments
- room polygons
- hosted openings
- levels
- confidence
- source references
- explicit uncertainty

Geometry can be reported as `meters`, `image-pixels`, `normalized`, or `unknown`. Only explicitly metric geometry can enter the deterministic BIM compiler.

### Human review

The Results page presents detected reconstruction entities with confidence and Accept/Reject controls. `Open accepted BIM` is blocked when geometry is not metric or when required review remains.

### Important professional limitation

Phase 29 is a reconstruction framework, not a claim that computer vision can perfectly digitize every architectural drawing. Ambiguous, low-resolution, distorted, unscaled, or incomplete drawings still require architect review. The application deliberately refuses to turn unverified geometry into "accurate" BIM.

### Test

`test-phase29.mjs` validates:

- reconstruction normalization
- confidence data
- review state
- metric compilation
- candidate Building IR
- manifest generation


### Completion verification
Phase 29 integration test passes with schema `archvision-bim-1.19`, 4 reconstructed walls, 1 room, 1 door, zero validation errors/warnings, and an eligible metric BIM candidate after review acceptance.
