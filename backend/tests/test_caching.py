import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import Request, Response

from app.services.cache_service import CacheService
from app.utils.cache_utils import cache_response


def test_cache_service():
    """Test CacheService methods."""

    async def _test():
        with patch("app.services.cache_service.redis.from_url") as mock_redis_cls:
            mock_redis = AsyncMock()
            mock_redis_cls.return_value = mock_redis

            service = CacheService()

            # Test set
            await service.set("test_key", {"data": "value"}, ttl=60)
            mock_redis.set.assert_called_once()

            # Test get hit
            mock_redis.get.return_value = '{"data": "value"}'
            result = await service.get("test_key")
            assert result == {"data": "value"}

            # Test get miss
            mock_redis.get.return_value = None
            result = await service.get("missing_key")
            assert result is None

            # Test delete
            await service.delete("test_key")
            mock_redis.delete.assert_called_with("test_key")

    asyncio.run(_test())


def test_cache_decorator():
    """Test @cache_response decorator."""

    async def _test():
        # Mock CacheService
        with patch("app.utils.cache_utils.cache_service") as mock_cache_service:
            mock_cache_service.get = AsyncMock(return_value=None)
            mock_cache_service.set = AsyncMock()

            # Define a dummy endpoint
            @cache_response(ttl=300)
            async def dummy_endpoint(request: Request, response: Response):
                return {"message": "Hello World"}

            # Mock Request
            mock_request = MagicMock(spec=Request)
            mock_request.url.path = "/api/test"
            mock_request.query_params.items.return_value = []

            mock_response = MagicMock(spec=Response)

            # First call: Cache miss
            result = await dummy_endpoint(request=mock_request, response=mock_response)
            assert result == {"message": "Hello World"}
            mock_cache_service.get.assert_called_once()
            mock_cache_service.set.assert_called_once()

            # Second call: Cache hit
            mock_cache_service.get.return_value = {"message": "Hello World"}
            mock_cache_service.set.reset_mock()

            result = await dummy_endpoint(request=mock_request, response=mock_response)
            assert result == {"message": "Hello World"}
            mock_cache_service.set.assert_not_called()

    asyncio.run(_test())


def test_cache_invalidation_pattern():
    """Test delete_pattern method."""

    async def _test():
        with patch("app.services.cache_service.redis.from_url") as mock_redis_cls:
            mock_redis = AsyncMock()
            mock_redis_cls.return_value = mock_redis

            service = CacheService()

            # Mock keys return
            mock_redis.keys.return_value = ["key1", "key2"]

            await service.delete_pattern("prefix*")

            mock_redis.keys.assert_called_with("prefix*")
            mock_redis.delete.assert_called_with("key1", "key2")

    asyncio.run(_test())
