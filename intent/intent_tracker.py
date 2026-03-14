"""
CINEOS Memory — Intent Tracker.

Tracks creative intent at project, scene, and shot levels.
Intents are versioned and can have parent intents, forming an
intent hierarchy that mirrors the creative workflow.
"""

from __future__ import annotations

from typing import Optional

from ..core.event_ledger import InMemoryEventStore
from ..core.events import creative_intent_updated
from ..core.models import (
    AuditEvent,
    CreativeIntent,
    IntentLevel,
)
from ..core.ulid import generate_ulid


class IntentTracker:
    """
    Service for tracking creative intent across project / scene / shot scopes.

    Each intent update is versioned.  The tracker maintains the latest
    intent per scope and emits audit events for downstream processing.
    """

    def __init__(self, event_store: InMemoryEventStore) -> None:
        self._intents: list[CreativeIntent] = []
        self._index: dict[str, CreativeIntent] = {}
        # (tenant_id, project_id, level, scope_id) -> latest intent
        self._latest: dict[tuple[str, str, str, str | None], CreativeIntent] = {}
        self._event_store = event_store

    # -- set / update intent ------------------------------------------------

    def set_intent(
        self,
        tenant_id: str,
        project_id: str,
        level: IntentLevel,
        description: str,
        author_id: str,
        *,
        scope_id: str | None = None,
    ) -> CreativeIntent:
        """Set or update creative intent at the given scope.

        If an existing intent exists at this scope, the new intent
        is linked as a successor (version incremented).
        """
        key = (tenant_id, project_id, level.value, scope_id)
        existing = self._latest.get(key)

        version = 1
        parent_id: str | None = None
        if existing:
            version = existing.version + 1
            parent_id = existing.id

        intent = CreativeIntent(
            tenant_id=tenant_id,
            project_id=project_id,
            level=level,
            scope_id=scope_id,
            description=description,
            author_id=author_id,
            version=version,
            parent_intent_id=parent_id,
        )

        self._intents.append(intent)
        self._index[intent.id] = intent
        self._latest[key] = intent

        # Emit audit event
        event = AuditEvent(
            tenant_id=tenant_id,
            event_type="creative.intent.updated",
            entity_type="creative_intent",
            entity_id=intent.id,
            actor_id=author_id,
            payload={
                "project_id": project_id,
                "level": level.value,
                "scope_id": scope_id,
                "description": description,
                "version": version,
            },
        )
        self._event_store.append(event)

        return intent

    # -- query ---------------------------------------------------------------

    def get(self, intent_id: str) -> Optional[CreativeIntent]:
        return self._index.get(intent_id)

    def get_current(
        self,
        tenant_id: str,
        project_id: str,
        level: IntentLevel,
        scope_id: str | None = None,
    ) -> Optional[CreativeIntent]:
        """Return the latest intent for the given scope."""
        key = (tenant_id, project_id, level.value, scope_id)
        return self._latest.get(key)

    def query(
        self,
        tenant_id: str,
        *,
        project_id: str | None = None,
        level: IntentLevel | None = None,
        author_id: str | None = None,
        limit: int = 100,
    ) -> list[CreativeIntent]:
        """Query intents by filters."""
        results: list[CreativeIntent] = []
        for intent in self._intents:
            if intent.tenant_id != tenant_id:
                continue
            if project_id and intent.project_id != project_id:
                continue
            if level and intent.level != level:
                continue
            if author_id and intent.author_id != author_id:
                continue
            results.append(intent)
            if len(results) >= limit:
                break
        return results

    def get_history(
        self,
        tenant_id: str,
        project_id: str,
        level: IntentLevel,
        scope_id: str | None = None,
    ) -> list[CreativeIntent]:
        """Return all versions of intent at the given scope, oldest first."""
        return [
            i for i in self._intents
            if (
                i.tenant_id == tenant_id
                and i.project_id == project_id
                and i.level == level
                and i.scope_id == scope_id
            )
        ]
