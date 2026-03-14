"""
CINEOS Memory — Approval rationale capture.

Records approval decisions with rationale, linking them to
reviewed entities and the review thread.
"""

from __future__ import annotations

from typing import Optional

from ..core.event_ledger import InMemoryEventStore
from ..core.events import approval_recorded
from ..core.models import (
    ApprovalRecord,
    ApprovalStatus,
    AuditEvent,
)
from ..core.ulid import generate_ulid


class ApprovalService:
    """
    Service for recording and querying approval decisions.

    Each approval captures the rationale, the approver, and links
    to the entity being reviewed plus any comment thread.
    """

    def __init__(self, event_store: InMemoryEventStore) -> None:
        self._approvals: list[ApprovalRecord] = []
        self._index: dict[str, ApprovalRecord] = {}
        self._event_store = event_store

    # -- record ---------------------------------------------------------------

    def record(
        self,
        tenant_id: str,
        project_id: str,
        status: ApprovalStatus,
        rationale: str,
        approver_id: str,
        related_entity_type: str,
        related_entity_id: str,
        *,
        review_thread_id: str | None = None,
        comment_ids: list[str] | None = None,
        parent_approval_id: str | None = None,
    ) -> ApprovalRecord:
        """Record an approval decision and emit an audit event."""
        record = ApprovalRecord(
            tenant_id=tenant_id,
            project_id=project_id,
            status=status,
            rationale=rationale,
            approver_id=approver_id,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            review_thread_id=review_thread_id,
            comment_ids=comment_ids or [],
            parent_approval_id=parent_approval_id,
        )
        self._approvals.append(record)
        self._index[record.id] = record

        # Emit audit event
        event = AuditEvent(
            tenant_id=tenant_id,
            event_type="approval.recorded",
            entity_type="approval_record",
            entity_id=record.id,
            actor_id=approver_id,
            payload={
                "project_id": project_id,
                "status": status.value,
                "rationale": rationale,
                "related_entity_type": related_entity_type,
                "related_entity_id": related_entity_id,
                "review_thread_id": review_thread_id,
            },
        )
        self._event_store.append(event)

        return record

    # -- query ---------------------------------------------------------------

    def get(self, approval_id: str) -> Optional[ApprovalRecord]:
        return self._index.get(approval_id)

    def query(
        self,
        tenant_id: str,
        *,
        project_id: str | None = None,
        status: ApprovalStatus | None = None,
        approver_id: str | None = None,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
        limit: int = 100,
    ) -> list[ApprovalRecord]:
        """Query approval records by filters."""
        results: list[ApprovalRecord] = []
        for rec in self._approvals:
            if rec.tenant_id != tenant_id:
                continue
            if project_id and rec.project_id != project_id:
                continue
            if status and rec.status != status:
                continue
            if approver_id and rec.approver_id != approver_id:
                continue
            if related_entity_type and rec.related_entity_type != related_entity_type:
                continue
            if related_entity_id and rec.related_entity_id != related_entity_id:
                continue
            results.append(rec)
            if len(results) >= limit:
                break
        return results

    def get_approval_chain(
        self,
        tenant_id: str,
        entity_type: str,
        entity_id: str,
    ) -> list[ApprovalRecord]:
        """Return all approvals for a given entity, oldest first."""
        return [
            r for r in self._approvals
            if (
                r.tenant_id == tenant_id
                and r.related_entity_type == entity_type
                and r.related_entity_id == entity_id
            )
        ]

    def latest_status(
        self,
        tenant_id: str,
        entity_type: str,
        entity_id: str,
    ) -> Optional[ApprovalStatus]:
        """Return the most recent approval status for an entity."""
        chain = self.get_approval_chain(tenant_id, entity_type, entity_id)
        return chain[-1].status if chain else None
