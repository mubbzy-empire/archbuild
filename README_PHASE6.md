# ArchVision Professional — Phase 6

Phase 6 is the architectural production-data phase. It adds associative BIM/CAD metadata without pretending to be a certified BIM authoring or structural-analysis package.

## Major additions
- ArchVision BIM/CAD schema `archvision-bim-0.6`.
- Parametric wall assembly metadata and quantities.
- Host-aware opening relationships.
- Model-derived associative dimensions for walls and openings.
- Model-derived room/door/window tags.
- Level and architectural grid datums stored in the Building IR.
- Production QA for hosted openings, wall lengths, rooms, stairs and site coordination.
- Phase 6 interoperability manifest export.
- The deterministic Building IR → geometry pipeline remains the single modeling source of truth.

## Important boundary
The exported Phase 6 BIM manifest is an interoperability preparation artifact. It is not claimed to be an IFC-certified export, structural engineering calculation, code-compliance certificate, or permit-ready drawing set.
