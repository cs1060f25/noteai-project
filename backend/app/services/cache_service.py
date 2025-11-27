import json
from typing import Any, Optional

import redis.asyncio as redis

from app.core.settings import settings


class CacheService:
    def __init__(self):
        self.redis = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)

    async def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache."""
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set a value in the cache with a TTL."""
        await self.redis.set(key, json.dumps(value), ex=ttl)

    async def delete(self, key: str) -> None:
        """Delete a value from the cache."""
        await self.redis.delete(key)

    async def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching a pattern."""
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)

    async def close(self) -> None:
        """Close the Redis connection."""
        await self.redis.close()


cache_service = CacheService()
