"""rate limiting configuration and utilities for slowapi."""

from functools import lru_cache

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.settings import settings


def _get_rate_limit_key(request: Request) -> str:
    """
    get rate limit key based on user authentication status.

    for authenticated users, use user_id as the key.
    for unauthenticated users, use IP address as the key.

    args:
        request: the FastAPI request object

    returns:
        rate limit key string
    """
    # try to get authenticated user from request state
    # the dependency injection will have set request.state.user if authenticated
    user = getattr(request.state, "user", None)

    if user and hasattr(user, "id"):
        # use user_id for authenticated requests
        return f"user:{user.id}"

    # fallback to IP address for unauthenticated requests
    return get_remote_address(request)


@lru_cache
def get_limiter() -> Limiter:
    """
    create and configure the slowapi Limiter instance.

    uses redis backend for distributed rate limiting.
    cached to ensure singleton pattern.

    returns:
        configured Limiter instance
    """
    # extract redis connection info from settings
    redis_url = settings.redis_url

    # create limiter with redis backend
    limiter = Limiter(
        key_func=_get_rate_limit_key,
        storage_uri=redis_url,
        # default rate limit (fallback if not specified on endpoint)
        default_limits=[f"{settings.rate_limit_per_minute}/minute"],
        # add headers to responses
        headers_enabled=True,
    )

    return limiter


# global limiter instance
limiter = get_limiter()
