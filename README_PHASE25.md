# ArchVision Professional — Phase 25

Phase 25 adds connected MEP authoring and multidisciplinary coordination on top of the canonical Building IR.

## Core flow

`Canonical Building IR → MEP networks → routes → fittings → risers → penetrations → coordination findings → 3D MEP geometry`

Disciplines:
- Electrical
- Plumbing
- HVAC
- Fire / life-safety intent

## Verification

Run:

```bash
node test-phase25.mjs
```

The test checks schema, networks, routes, fittings, risers, penetrations, equipment and QA.

## Important

Phase 25 is coordination/design-intent functionality and does not certify engineering design or local code compliance.
