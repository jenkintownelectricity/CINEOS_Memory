"""
CINEOS Memory — Tests for memory items, creative decisions, and intent tracking.

Covers the memory store, event ledger, creative decision recording,
intent versioning, and similarity search.
"""

from __future__ import annotations

import math
import os
import sys
from datetime import datetime, timedelta

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.models import (
    ApprovalRecord,
    ApprovalStatus,
    AuditEvent,
    CreativeDecision,
    CreativeIntent,
    DecisionType,
    IntentLevel,
    MemoryItem,
    MemoryType,
)
from core.memory_store import MemoryStore
from core.event_ledger import EventLedger, InMemoryEventStore

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TENANT_A = "studio-alpha"
TENANT_B = "studio-beta"
PROJECT_A = "film-001"
PROJECT_B = "film-002"
AUTHOR_ID = "director-001"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def memory_store() -> MemoryStore:
    return MemoryStore()


@pytest.fixture
def event_store() -> InMemoryEventStore:
    return InMemoryEventStore()


@pytest.fixture
def event_ledger(event_store: InMemoryEventStore) -> EventLedger:
    return EventLedger(backend=event_store)


# ---------------------------------------------------------------------------
# MemoryItem model tests
# ---------------------------------------------------------------------------

class TestMemoryItemModel:
    """Test MemoryItem construction and defaults."""

    def test_create_memory_item(self) -> None:
        item = MemoryItem(
            tenant_id=TENANT_A,
            project_id=PROJECT_A,
            type=MemoryType.DECISION,
            content="Used wide angle for establishing shot",
            source_event_id="evt-001",
        )
        assert item.tenant_id == TENANT_A
        assert item.type == MemoryType.DECISION
        assert item.id  # auto-generated

    def test_memory_type_enum(self) -> None:
        assert MemoryType.INSIGHT.value == "insight"
        assert MemoryType.OBSERVATION.value == "observation"
        assert MemoryType.RATIONALE.value == "rationale"

    def test_memory_item_with_embedding(self) -> None:
        item = MemoryItem(
            tenant_id=TENANT_A,
            project_id=PROJECT_A,
            type=MemoryType.PATTERN,
            content="Recurring warm palette",
            source_event_id="evt-002",
            embedding_vector=[0.1, 0.2, 0.3],
        )
        assert item.embedding_vector == [0.1, 0.2, 0.3]


# ---------------------------------------------------------------------------
# MemoryStore tests
# ---------------------------------------------------------------------------

class TestMemoryStore:
    """Test memory storage and retrieval."""

    def _item(
        self,
        tenant_id: str = TENANT_A,
        project_id: str = PROJECT_A,
        memory_type: MemoryType = MemoryType.DECISION,
        content: str = "Test memory",
        embedding: list[float] | None = None,
    ) -> MemoryItem:
        return MemoryItem(
            tenant_id=tenant_id,
            project_id=project_id,
            type=memory_type,
            content=content,
            source_event_id="evt-test",
            embedding_vector=embedding,
        )

    def test_store_and_get(self, memory_store: MemoryStore) -> None:
        item = self._item()
        memory_store.store(item)
        retrieved = memory_store.get(item.id)
        assert retrieved is not None
        assert retrieved.id == item.id

    def test_get_missing_returns_none(self, memory_store: MemoryStore) -> None:
        assert memory_store.get("nonexistent") is None

    def test_query_by_tenant(self, memory_store: MemoryStore) -> None:
        memory_store.store(self._item(tenant_id=TENANT_A))
        memory_store.store(self._item(tenant_id=TENANT_B))
        results = memory_store.query(TENANT_A)
        assert len(results) == 1
        assert results[0].tenant_id == TENANT_A

    def test_query_by_project(self, memory_store: MemoryStore) -> None:
        memory_store.store(self._item(project_id=PROJECT_A))
        memory_store.store(self._item(project_id=PROJECT_B))
        results = memory_store.query(TENANT_A, project_id=PROJECT_A)
        assert len(results) == 1

    def test_query_by_type(self, memory_store: MemoryStore) -> None:
        memory_store.store(self._item(memory_type=MemoryType.DECISION))
        memory_store.store(self._item(memory_type=MemoryType.INSIGHT))
        results = memory_store.query(TENANT_A, memory_type=MemoryType.DECISION)
        assert len(results) == 1

    def test_query_pagination(self, memory_store: MemoryStore) -> None:
        for i in range(5):
            memory_store.store(self._item(content=f"Item {i}"))
        results = memory_store.query(TENANT_A, limit=2, offset=0)
        assert len(results) == 2
        results_page2 = memory_store.query(TENANT_A, limit=2, offset=2)
        assert len(results_page2) == 2

    def test_store_many(self, memory_store: MemoryStore) -> None:
        items = [self._item(content=f"Batch {i}") for i in range(3)]
        memory_store.store_many(items)
        assert memory_store.count(TENANT_A) == 3

    def test_archive(self, memory_store: MemoryStore) -> None:
        item = self._item()
        memory_store.store(item)
        assert memory_store.archive(item.id) is True
        assert memory_store.get(item.id) is None
        assert memory_store.count(TENANT_A) == 0

    def test_delete(self, memory_store: MemoryStore) -> None:
        item = self._item()
        memory_store.store(item)
        assert memory_store.delete(item.id) is True
        assert memory_store.get(item.id) is None

    def test_delete_missing_returns_false(self, memory_store: MemoryStore) -> None:
        assert memory_store.delete("nonexistent") is False


# ---------------------------------------------------------------------------
# Similarity search tests
# ---------------------------------------------------------------------------

class TestSimilaritySearch:
    """Test vector-based similarity search."""

    def test_similarity_search_returns_closest(self, memory_store: MemoryStore) -> None:
        memory_store.store(self._item(content="Close", embedding=[1.0, 0.0, 0.0]))
        memory_store.store(self._item(content="Far", embedding=[0.0, 1.0, 0.0]))
        query_vec = [0.9, 0.1, 0.0]
        results = memory_store.similarity_search(TENANT_A, query_vec, top_k=1)
        assert len(results) == 1
        assert results[0][0].content == "Close"
        assert results[0][1] > 0

    def test_similarity_search_respects_tenant(self, memory_store: MemoryStore) -> None:
        memory_store.store(self._item(tenant_id=TENANT_A, embedding=[1.0, 0.0]))
        memory_store.store(self._item(tenant_id=TENANT_B, embedding=[1.0, 0.0]))
        results = memory_store.similarity_search(TENANT_A, [1.0, 0.0])
        assert len(results) == 1
        assert results[0][0].tenant_id == TENANT_A

    def test_similarity_search_skips_items_without_embedding(
        self, memory_store: MemoryStore
    ) -> None:
        memory_store.store(self._item(content="No vec", embedding=None))
        memory_store.store(self._item(content="Has vec", embedding=[1.0, 0.0]))
        results = memory_store.similarity_search(TENANT_A, [1.0, 0.0])
        assert len(results) == 1
        assert results[0][0].content == "Has vec"

    def _item(self, **kwargs) -> MemoryItem:
        defaults = {
            "tenant_id": TENANT_A,
            "project_id": PROJECT_A,
            "memory_type": MemoryType.DECISION,
            "content": "Test",
            "embedding": None,
        }
        defaults.update(kwargs)
        return MemoryItem(
            tenant_id=defaults["tenant_id"],
            project_id=defaults["project_id"],
            type=defaults["memory_type"],
            content=defaults["content"],
            source_event_id="evt-test",
            embedding_vector=defaults["embedding"],
        )


# ---------------------------------------------------------------------------
# Creative Decision tests
# ---------------------------------------------------------------------------

class TestCreativeDecision:
    """Test creative decision model."""

    def test_create_decision(self) -> None:
        decision = CreativeDecision(
            tenant_id=TENANT_A,
            project_id=PROJECT_A,
            decision_type=DecisionType.EDITORIAL,
            description="Use jump cut for montage",
            rationale="Creates energy and forward momentum",
            alternatives_considered=["dissolve", "straight cut"],
            chosen_option="jump cut",
            author_id=AUTHOR_ID,
        )
        assert decision.decision_type == DecisionType.EDITORIAL
        assert decision.chosen_option == "jump cut"
        assert len(decision.alternatives_considered) == 2


# ---------------------------------------------------------------------------
# Creative Intent tests
# ---------------------------------------------------------------------------

class TestCreativeIntent:
    """Test creative intent tracking."""

    def test_create_project_intent(self) -> None:
        intent = CreativeIntent(
            tenant_id=TENANT_A,
            project_id=PROJECT_A,
            level=IntentLevel.PROJECT,
            description="Warm, nostalgic tone throughout",
            author_id=AUTHOR_ID,
        )
        assert intent.level == IntentLevel.PROJECT
        assert intent.version == 1

    def test_scene_level_intent(self) -> None:
        intent = CreativeIntent(
            tenant_id=TENANT_A,
            project_id=PROJECT_A,
            level=IntentLevel.SCENE,
            scope_id="scene-001",
            description="Build tension through tight framing",
            author_id=AUTHOR_ID,
        )
        assert intent.level == IntentLevel.SCENE
        assert intent.scope_id == "scene-001"

    def test_intent_versioning(self) -> None:
        v1 = CreativeIntent(
            tenant_id=TENANT_A, project_id=PROJECT_A,
            level=IntentLevel.PROJECT, description="Original intent",
            author_id=AUTHOR_ID, version=1,
        )
        v2 = CreativeIntent(
            tenant_id=TENANT_A, project_id=PROJECT_A,
            level=IntentLevel.PROJECT, description="Revised intent",
            author_id=AUTHOR_ID, version=2,
            parent_intent_id=v1.id,
        )
        assert v2.parent_intent_id == v1.id
        assert v2.version == 2


# ---------------------------------------------------------------------------
# Event ledger tests
# ---------------------------------------------------------------------------

class TestEventLedger:
    """Test event storage and querying."""

    def test_append_and_get(self, event_store: InMemoryEventStore) -> None:
        event = AuditEvent(
            tenant_id=TENANT_A,
            event_type="decision.made",
            entity_type="timeline",
            entity_id="tl-001",
            actor_id=AUTHOR_ID,
        )
        event_store.append(event)
        retrieved = event_store.get(event.id)
        assert retrieved is not None
        assert retrieved.id == event.id

    def test_query_by_tenant(
        self, event_store: InMemoryEventStore, event_ledger: EventLedger
    ) -> None:
        event_store.append(AuditEvent(tenant_id=TENANT_A, event_type="test"))
        event_store.append(AuditEvent(tenant_id=TENANT_B, event_type="test"))
        results = event_ledger.query_events(TENANT_A)
        assert len(results) == 1

    def test_query_by_event_type(
        self, event_store: InMemoryEventStore, event_ledger: EventLedger
    ) -> None:
        event_store.append(AuditEvent(tenant_id=TENANT_A, event_type="decision.made"))
        event_store.append(AuditEvent(tenant_id=TENANT_A, event_type="comment.added"))
        results = event_ledger.query_events(TENANT_A, event_type="decision.made")
        assert len(results) == 1

    def test_query_by_actor(
        self, event_store: InMemoryEventStore, event_ledger: EventLedger
    ) -> None:
        event_store.append(AuditEvent(
            tenant_id=TENANT_A, event_type="test", actor_id=AUTHOR_ID,
        ))
        event_store.append(AuditEvent(
            tenant_id=TENANT_A, event_type="test", actor_id="other-user",
        ))
        results = event_ledger.query_events(TENANT_A, actor_id=AUTHOR_ID)
        assert len(results) == 1

    def test_replay_returns_all(
        self, event_store: InMemoryEventStore, event_ledger: EventLedger
    ) -> None:
        for i in range(5):
            event_store.append(AuditEvent(tenant_id=TENANT_A, event_type=f"evt-{i}"))
        replayed = event_ledger.replay(TENANT_A)
        assert len(replayed) == 5
