"""Tests for API key endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.api.dependencies.clerk_auth import get_current_user_clerk as get_current_user
from app.core.database import get_db
from app.core.settings import settings
from app.main import app
from app.models.user import User

# Setup test client
client = TestClient(app)

# Mock user
mock_user = User(
    id=1,
    user_id="test-user-id",
    email="test@example.com",
    clerk_user_id="test-clerk-id",
    is_active=True,
    is_verified=True,
)


# Mock settings
test_secret = Fernet.generate_key().decode()


@pytest.fixture
def override_settings():
    original_secret = settings.api_key_encryption_secret
    settings.api_key_encryption_secret = test_secret
    yield
    settings.api_key_encryption_secret = original_secret


@pytest.fixture
def mock_db():
    mock_session = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_session
    yield mock_session
    del app.dependency_overrides[get_db]


@pytest.fixture
def mock_auth():
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]


def test_store_api_key(mock_auth, mock_db, override_settings):
    """Test storing an API key."""
    with patch("google.generativeai.GenerativeModel") as mock_model:
        # Mock successful generation
        mock_model.return_value.generate_content.return_value = MagicMock()

        response = client.post("/api/v1/users/api-keys", json={"api_key": "valid-api-key"})

        assert response.status_code == 200
        data = response.json()
        assert data["has_api_key"] is True
        assert "sk-..." in data["masked_key"]
        assert mock_user.gemini_api_key_encrypted is not None


def test_store_invalid_api_key(mock_auth, mock_db, override_settings):
    """Test storing an invalid API key."""
    with patch("google.generativeai.GenerativeModel") as mock_model:
        # Mock failed generation
        mock_model.return_value.generate_content.side_effect = Exception("Invalid key")

        response = client.post("/api/v1/users/api-keys", json={"api_key": "invalid-api-key"})

        assert response.status_code == 400
        assert "Invalid API key" in response.json()["detail"]


def test_get_api_key_status(mock_auth, mock_db, override_settings):
    """Test getting API key status."""
    # First store a key (manually or via endpoint)
    # We'll just mock the user state since we're using the same mock_user instance
    # But wait, the mock_user is a global object here, so state persists if not reset?
    # Actually, dependency override returns the same object.

    # Let's manually set the encrypted key on the mock user for this test
    from app.core.security import encrypt_string

    mock_user.gemini_api_key_encrypted = encrypt_string("test-key", test_secret)

    response = client.get("/api/v1/users/api-keys/status")
    assert response.status_code == 200
    data = response.json()
    assert data["has_api_key"] is True
    assert "sk-..." in data["masked_key"]


def test_delete_api_key(mock_auth, mock_db, override_settings):
    """Test deleting API key."""
    mock_user.gemini_api_key_encrypted = "some-encrypted-value"

    response = client.delete("/api/v1/users/api-keys")
    assert response.status_code == 204

    assert mock_user.gemini_api_key_encrypted is None


def test_validate_api_key(mock_auth):
    """Test validating API key."""
    with patch("google.generativeai.GenerativeModel") as mock_model:
        mock_model.return_value.generate_content.return_value = MagicMock()

        response = client.post("/api/v1/users/api-keys/validate", json={"api_key": "test-key"})

        assert response.status_code == 200
        assert response.json()["is_valid"] is True
