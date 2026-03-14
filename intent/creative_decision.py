"""
CINEOS Memory — Creative Decision service.

Records creative decisions, links them to the provenance chain,
and emits CloudEvents so the memory derivation engine can pick them up.
"""

from __future__ import annotations

from typing import Optional

from ..core.event_ledger import EventLedger, InMemoryEventStore
from ..core.events import creative_decision_recorded
from ..core.models import (
    AuditEvent,
    CreativeDecision,
    DecisionType,
)
from ..core.ulid import generate_ulid


class CreativeDecisionService:
    """
    Service for recording and querying creative decisions.

    Each recorded decision also produces an ``AuditEvent`` appended to
    the event ledger so that downstream derivation rules can fire.
    """

    def __init__(self, event_store: InMemoryEventStore) -> None:
        self._decisions: list[CreativeDecision] = []
        self._index: dict[str, CreativeDecision] = {}
        self._event_store = event_store

    # -- record --------------------------------------------------------------

    def record(
        self,
        tenant_id: str,
        project_id: str,
        decision_type: DecisionType,
        description: str,
        rationale: str,
        chosen_option: str,
        author_id: str,
        *,
        alternatives_considered: list[str] | None = None,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
        provenance_link_id: str | None = None,
    ) -> CreativeDecision:
        """Record a creative decision and emit an audit event."""
        decision = CreativeDecision(
            tenant_id=tenant_id,
            project_id=project_id,
            decision_type=decision_type,
            description=description,
            rationale=rationale,
            alternatives_considered=alternatives_considered or [],
            chosen_option=chosen_option,
            author_id=author_id,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            provenance_link_id=provenance_link_id,
        )
        self._decisions.append(decision)
        self._index[decision.id] = decision

        # Append canonical audit event
        event = AuditEvent(
            tenant_id=tenant_id,
            event_type="creative.decision.recorded",
            entity_type="creative_decision",
            entity_id=decision.id,
            actor_id=author_id,
            payload={
                "project_id": project_id,
                "decision_type": decision_type.value,
                "description": description,
                "rationale": rationale,
                "chosen_option": chosen_option,
                "alternatives_considered": decision.alternatives_considered,
            },
        )
        self._event_store.append(event)
        return decision

    # -- query ---------------------------------------------------------------

    def get(self, decision_id: str) -> Optional[CreativeDecision]:
        return self._index.get(decision_id)

    def query(
        self,
        tenant_id: str,
        *,
        project_id: str | None = None,
        decision_type: DecisionType | None = None,
        author_id: str | None = None,
        limit: int = 100,
    ) -> list[CreativeDecision]:
        results: list[CreativeDecision] = []
        for d in self._decisions:
            if d.tenant_id != tenant_id:
                continue
            if project_id and d.project_id != project_id:
                continue
            if decision_type and d.decision_type != decision_type:
                continue
            if author_id and d.author_id != author_id:
                continue
            results.append(d)
            if len(results) >= limit:
                break
        return results
