"""
CINEOS Memory — Memory storage and retrieval.

Stores derived memory items and supports:
  - query by type, project, time range
  - similarity search (vector-based cosine similarity)
  - memory lifecycle management (archive / expire)

This is a *derived* store.  It can always be rebuilt from the event
ledger + generation rules.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from .memory_item import cosine_similarity
from .models import MemoryItem, MemoryType


class MemoryStore:
    """
    In-memory storage for MemoryItem instances.

    Swap with a Postgres / pgvector / Qdrant backend by implementing
    the same public interface.
    """

    def __init__(self) -> None:
        self._items: list[MemoryItem] = []
        self._index: dict[str, MemoryItem] = {}
        self._archived: dict[str, MemoryItem] = {}

    # -- write ---------------------------------------------------------------

    def store(self, item: MemoryItem) -> MemoryItem:
        """Persist a memory item and return it."""
        self._items.append(item)
        self._index[item.id] = item
        return item

    def store_many(self, items: list[MemoryItem]) -> list[MemoryItem]:
        for item in items:
            self.store(item)
        return items

    # -- read ----------------------------------------------------------------

    def get(self, item_id: str) -> Optional[MemoryItem]:
        return self._index.get(item_id)

    def query(
        self,
        tenant_id: str,
        *,
        project_id: str | None = None,
        memory_type: MemoryType | None = None,
        after: datetime | None = None,
        before: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MemoryItem]:
        """Filter memory items by tenant, project, type, and time range."""
        results: list[MemoryItem] = []
        for item in self._items:
            if item.tenant_id != tenant_id:
                continue
            if project_id and item.project_id != project_id:
                continue
            if memory_type and item.type != memory_type:
                continue
            if after and item.created_at <= after:
                continue
            if before and item.created_at >= before:
                continue
            results.append(item)
        return results[offset : offset + limit]

    # -- vector similarity ---------------------------------------------------

    def similarity_search(
        self,
        tenant_id: str,
        query_vector: list[float],
        *,
        project_id: str | None = None,
        top_k: int = 10,
        min_score: float = 0.0,
    ) -> list[tuple[MemoryItem, float]]:
        """
        Return the *top_k* memory items most similar to *query_vector*
        (cosine similarity), optionally scoped to a project.
        """
        scored: list[tuple[MemoryItem, float]] = []
        for item in self._items:
            if item.tenant_id != tenant_id:
                continue
            if project_id and item.project_id != project_id:
                continue
            if item.embedding_vector is None:
                continue
            score = cosine_similarity(query_vector, item.embedding_vector)
            if score >= min_score:
                scored.append((item, score))
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:top_k]

    # -- lifecycle management ------------------------------------------------

    def archive(self, item_id: str) -> bool:
        """Move a memory item to the archive.  Returns True if found."""
        item = self._index.pop(item_id, None)
        if item is None:
            return False
        self._items = [i for i in self._items if i.id != item_id]
        self._archived[item_id] = item
        return True

    def delete(self, item_id: str) -> bool:
        """Permanently delete a memory item.  Returns True if found."""
        removed = self._index.pop(item_id, None)
        if removed is None:
            return self._archived.pop(item_id, None) is not None
        self._items = [i for i in self._items if i.id != item_id]
        return True

    def count(self, tenant_id: str) -> int:
        return sum(1 for i in self._items if i.tenant_id == tenant_id)
