import functools
import inspect
import json
from typing import Callable, Optional

from fastapi import Request, Response

from app.services.cache_service import cache_service


def cache_response(
    ttl: int = 300,
    key_builder: Optional[Callable[[Request], str]] = None,
):
    """
    Decorator to cache FastAPI endpoint responses.

    Args:
        ttl: Time to live in seconds.
        key_builder: Optional function to generate a custom cache key.
                     If None, uses the request path and query parameters.
    """

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract Request object from args or kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get("request")

            if request is None:
                # If no request object found, skip caching
                return await func(*args, **kwargs)

            # Generate cache key
            if key_builder:
                cache_key = key_builder(request)
            else:
                # Default key: path + sorted query params
                query_params = sorted(request.query_params.items())
                query_string = "&".join(f"{k}={v}" for k, v in query_params)
                cache_key = f"cache:{request.url.path}?{query_string}"

            # Check cache
            cached_data = await cache_service.get(cache_key)
            if cached_data:
                return cached_data

            # Execute endpoint
            if inspect.iscoroutinefunction(func):
                response = await func(*args, **kwargs)
            else:
                response = func(*args, **kwargs)

            # Cache response
            # Note: This only works for JSON responses or data that can be serialized.
            # If the response is a Pydantic model, FastAPI handles serialization later.
            # We need to capture the data before it's returned.
            # However, since we are wrapping the endpoint, the return value is usually
            # the data (dict, list, Pydantic model) or a Response object.

            if isinstance(response, Response):
                # If it's already a Response object, we might need to extract body
                # This is complex for streaming responses, etc.
                # We can't easily cache Response objects directly without reading body
                # For now, we only support caching Pydantic models or dicts
                return response

            try:
                if hasattr(response, "model_dump"):
                    data = response.model_dump(mode="json")
                else:
                    data = json.loads(json.dumps(response, default=str))

                await cache_service.set(cache_key, data, ttl)
            except Exception as e:
                # Log error but don't fail request
                print(f"Cache error: {e}")
                pass

            return response

        return wrapper

    return decorator
