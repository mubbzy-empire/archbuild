# ArchVision Professional — Phase 30

## Professional Model QA & Issue Coordination

Schema: `archvision-bim-1.20`

Phase 30 is the deterministic QA gate after Phase 29 blueprint reconstruction. It inspects the canonical Building IR without silently changing design intent.

### Added
- Professional model QA engine
- Deterministic wall, room and opening checks
- Duplicate-ID detection
- Wall endpoint coordination warnings
- Existing MEP/coordination clash surfacing
- Severity levels: error / warning / info
- Issue registry with open / accepted / rejected dispositions
- QA summary and run count
- Phase 30 validation and manifest export
- Geometry-builder integration so Phase 30 QA state travels with every built model

### Professional intent
QA findings are coordination evidence, not automatic design corrections. Warnings such as dangling wall endpoints can be legitimate architectural conditions and must be resolved by professional review.

### Gate
- **passed** — no errors or warnings
- **passed-with-warnings** — no errors, but coordination warnings remain
- **failed** — one or more deterministic errors remain

Phase 30 does not claim code validation replaces architect, engineer, code, or construction-document review.
