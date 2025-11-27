import pytest
from app.models.user import User
from app.api.dependencies.clerk_auth import get_current_user_clerk
from datetime import datetime

# Mock user data
MOCK_USER = User(
    user_id="user_123",
    email="test@example.com",
    name="Test User",
    picture_url="http://example.com/pic.jpg",
    organization="Test Org",
    email_notifications=True,
    processing_notifications=True,
    clerk_user_id="user_123_clerk",
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)

from app.main import app

@pytest.fixture
def override_auth_dependency():
    def mock_get_current_user():
        return MOCK_USER
    
    app.dependency_overrides[get_current_user_clerk] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

def test_get_current_user_profile(client, override_auth_dependency):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "user_123"
    assert data["email"] == "test@example.com"

def test_update_user_profile(client, override_auth_dependency, db):
    # Ensure user exists in DB for update to work (since it commits)
    # However, the dependency returns a User object, but the route uses db.commit()
    # which implies the object should be attached to the session or we mock the db session too.
    # In our conftest, db is a session.
    # We need to add the mock user to the db session.
    
    # Check if user is already in db (it won't be because it's a fresh db per function)
    # But the dependency returns a detached object or a new object.
    # The route does: db.refresh(current_user) which requires it to be in session.
    
    # So we should add it to the db in the test.
    db.add(MOCK_USER)
    db.commit()
    
    update_data = {
        "name": "Updated Name",
        "email_notifications": False
    }
    response = client.patch("/api/v1/users/me", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["email_notifications"] is False
