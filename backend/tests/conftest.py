import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Set environment variables for testing
# We keep these as valid URLs but mock the connection
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["CELERY_BROKER_URL"] = "redis://localhost:6379/0"
os.environ["CELERY_RESULT_BACKEND"] = "redis://localhost:6379/0"

# Mock external services before importing app
sys.modules["boto3"] = MagicMock()

# Patch redis.asyncio.from_url to prevent CacheService from connecting

patcher = patch("redis.asyncio.from_url")
patcher.start()

# We need to import app.core.rate_limit_config before app.main to patch get_limiter
# But app.main imports it too.
# Let's try to patch the settings used by rate_limit_config, or the Limiter class itself?
# Easiest is to patch get_limiter in the module, but we need to import it first.
# However, importing it might trigger side effects if we are not careful.
# Actually, rate_limit_config.py imports settings and defines get_limiter. It calls get_limiter() at the end.
# So we need to patch settings.redis_url *before* importing rate_limit_config?
# But CacheService needs a redis url (even if mocked).

# Let's use a fixture to override the dependency or patch the global limiter.
# But the global limiter is created at import time.

# Strategy:
# 1. Mock redis.asyncio.from_url (for CacheService)
# 2. Mock limits.storage.redis.RedisStorage (for slowapi) OR force memory storage.

# To force memory storage for slowapi without breaking CacheService:
# We can patch app.core.rate_limit_config.settings.redis_url to be "memory://" JUST for that module?
# No, settings is a singleton.

# Better: Patch `slowapi.Limiter` to ignore the storage_uri arg and always use memory?
with patch("slowapi.Limiter") as MockLimiter:
    # We don't want to mock the whole class, just the init?
    # Actually, if we just let it use "memory://", slowapi works.
    # But CacheService fails with "memory://".
    pass

# Let's try this:
# 1. Set env var REDIS_URL to "redis://mock" (so CacheService is happy with scheme)
# 2. Mock redis.asyncio.from_url (so CacheService gets a mock)
# 3. Patch app.core.rate_limit_config.get_limiter to return a Limiter with storage_uri="memory://"
#    This requires importing rate_limit_config, patching, and THEN importing app.main?
#    But app.main imports rate_limit_config.

from slowapi import Limiter  # noqa: E402
from slowapi.util import get_remote_address  # noqa: E402

import app.core.rate_limit_config  # noqa: E402

# Overwrite the global limiter in rate_limit_config with a memory-based one
app.core.rate_limit_config.limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)

from app.core.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.database import Base  # noqa: E402

# Use in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    # Use in-memory SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


from app.api.dependencies.clerk_auth import get_current_user_clerk  # noqa: E402


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    # Mock authentication
    app.dependency_overrides[get_current_user_clerk] = lambda: {
        "id": "user_2bP4...",
        "email_addresses": [{"email_address": "test@example.com"}],
        "first_name": "Test",
        "last_name": "User",
    }

    with TestClient(app) as c:
        yield c

    # Clean up overrides
    app.dependency_overrides.clear()


from app.services.cache_service import cache_service  # noqa: E402


@pytest.fixture(autouse=True)
def mock_cache_service():
    """Mock CacheService instance methods directly to ensure all references use mocks."""
    # Store original methods
    original_get = cache_service.get
    original_set = cache_service.set
    original_delete_pattern = cache_service.delete_pattern

    # Replace with AsyncMocks
    cache_service.get = AsyncMock(return_value=None)
    cache_service.set = AsyncMock()
    cache_service.delete_pattern = AsyncMock()

    yield cache_service

    # Restore original methods
    cache_service.get = original_get
    cache_service.set = original_set
    cache_service.delete_pattern = original_delete_pattern
