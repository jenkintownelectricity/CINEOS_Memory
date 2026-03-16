# CINEOS_Memory — Canonical Decision Graph Compliance

**Status**: compliant
**Doctrine**: ValidKernel-Governance/docs/canonical-decision-graph-doctrine.md
**Effective**: Post-Wave 3.5, before Wave 4

---

## Compliance Statement

CINEOS_Memory stores reasoning and memory as structured canonical records within the Canonical Decision Graph (CDG). The memory system does not maintain independent authoritative data stores.

## Canonical Entities Used

| Entity | Usage | Status |
|--------|-------|--------|
| memory_chain_link | Primary memory chain storage | compliant |
| reasoning_record | Structured reasoning attached to memory nodes | compliant (when implemented) |
| evidence_reference | Evidence linked to memory reasoning | compliant (when implemented) |
| timeline_mutation | Timeline mutations linked via memory_ref | compliant |

## Reasoning Memory Compliance

- Memory reasoning MUST be stored as structured `reasoning_record` objects
- Narrative memory explanation is permitted only as derived explanation with `derived_from_record_id`
- The existing `timeline_mutation_link.py` contract correctly links mutations to memory via structured refs
- Memory narratives without canonical record linkage are classified as unlinked narrative and are non-compliant

## Derived Surface Rule

- Memory lens panel visualizations are derived surfaces, not authoritative storage
- Memory summaries and AI-generated explanations must carry `derived_explanation_link` records
- Panel-local memory caches are in-memory only and are not persisted as canonical data

## Migration Notes

No migration required. Current contracts are structure-first. When full reasoning emission is implemented (Wave 4+), `reasoning_record` objects must be emitted before any prose explanation.
