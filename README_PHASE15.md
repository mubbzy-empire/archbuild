# Phase 15 — Associative Model Engine

Phase 15 is the next step after interactive CAD authoring. It introduces a deterministic change-impact and regeneration layer over the Building IR.

## Core flow

Manual/AI/Blueprint/Estate input → Building IR → dependency graph → changed element → dependent elements → regeneration → QA/export.

The Phase 15 layer currently updates hosted opening metadata, room metrics, and associative documentation metadata. It also records the affected dependency set for auditability.

This is not a claim of full commercial BIM associativity or code compliance. Construction and engineering decisions still require professional review.
