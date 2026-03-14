"""
CINEOS Memory — Event Ledger Query Service.

Read-only view over the event stream.  The ledger itself is append-only
and owned by the platform event bus; this module provides tenant-scoped
query and replay capabilities.

NOTE: This is a *query* service.  It never writes events.  Writes flow
through the canonical event bus.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, Protocol, Sequence

from .models import AuditEvent


# ---------------------------------------------------------------------------
# Abstract store protocol — swap for Postgres / Kafka / in-memory
# ---------------------------------------------------------------------------

class EventStoreBackend(Protocol):
    """Minimal contract for an event persistence backend."""

    def append(self, event: AuditEvent) -> None: ...

    def query(
        self,
        tenant_id: str,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        event_type: str | None = None,
        actor_id: str | None = None,
        after: datetime | None = None,
        before: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditEvent]: ...

    def get(self, event_id: str) -> AuditEvent | None: ...


# ---------------------------------------------------------------------------
# In-memory backend (for tests and local dev)
# ---------------------------------------------------------------------------

class InMemoryEventStore:
    """Append-only in-memory event store — useful for tests."""

    def __init__(self) -> None:
        self._events: list[AuditEvent] = []
        self._index: dict[str, AuditEvent] = {}

    def append(self, event: AuditEvent) -> None:
        self._events.append(event)
        self._index[event.id] = event

    def get(self, event_id: str) -> AuditEvent | None:
        return self._index.get(event_id)

    def query(
        self,
        tenant_id: str,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        event_type: str | None = None,
        actor_id: str | None = None,
        after: datetime | None = None,
        before: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditEvent]:
        results: list[AuditEvent] = []
        for e in self._events:
            if e.tenant_id != tenant_id:
                continue
            if entity_type and e.entity_type != entity_type:
                continue
            if entity_id and e.entity_id != entity_id:
                continue
            if event_type and e.event_type != event_type:
                continue
            if actor_id and e.actor_id != actor_id:
                continue
            if after and e.occurred_at <= after:
                continue
            if before and e.occurred_at >= before:
                continue
            results.append(e)
        return results[offset : offset + limit]


# ---------------------------------------------------------------------------
# EventLedger — the public query API
# ---------------------------------------------------------------------------

class EventLedger:
    """
    Read-only query facade over the event store.

    All queries are tenant-scoped: callers *must* supply a tenant_id.
    """

    def __init__(self, backend: EventStoreBackend) -> None:
        self._backend = backend

    # -- single lookup --

    def get_event(self, event_id: str) -> Optional[AuditEvent]:
        return self._backend.get(event_id)

    # -- filtered query --

    def query_events(
        self,
        tenant_id: str,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        event_type: str | None = None,
        actor_id: str | None = None,
        after: datetime | None = None,
        before: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditEvent]:
        """Return events matching the supplied filters, newest-first."""
        return self._backend.query(
            tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            actor_id=actor_id,
            after=after,
            before=before,
            limit=limit,
            offset=offset,
        )

    # -- replay --

    def replay(
        self,
        tenant_id: str,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        after: datetime | None = None,
        before: datetime | None = None,
    ) -> Sequence[AuditEvent]:
        """
        Replay all matching events in chronological order.

        Returns the full untruncated stream — use with care on large
        datasets.  For bounded reads, prefer ``query_events`` with
        ``limit`` / ``offset``.
        """
        return self._backend.query(
            tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            after=after,
            before=before,
            limit=2**31,
            offset=0,
        )
