import pytest
from unittest.mock import patch, MagicMock
from app.models.user import User
from app.api.dependencies.clerk_auth import get_current_user_clerk
from datetime import datetime

from app.main import app

MOCK_USER = User(
    user_id="user_123",
    email="test@example.com",
    name="Test User",
    clerk_user_id="user_123_clerk",
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow()
)

@pytest.fixture
def override_auth_dependency():
    def mock_get_current_user():
        return MOCK_USER
    app.dependency_overrides[get_current_user_clerk] = mock_get_current_user
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def mock_external_services():
    with patch("app.api.routes.upload.s3_service") as s3_mock, \
         patch("app.api.routes.upload.process_video_optimized") as celery_mock:
        
        s3_mock.generate_object_key.return_value = "uploads/test.mp4"
        s3_mock.generate_presigned_upload_url.return_value = {
            "url": "http://s3.example.com/upload",
            "fields": {}
        }
        s3_mock.check_object_exists.return_value = True
        
        celery_task = MagicMock()
        celery_task.id = "task_123"
        celery_mock.delay.return_value = celery_task
        
        yield s3_mock, celery_mock

def test_upload_and_process_workflow(client, override_auth_dependency, mock_external_services, db):
    # 1. Add user
    db.add(MOCK_USER)
    db.commit()

    # 2. Initiate Upload
    init_payload = {
        "filename": "lecture.mp4",
        "file_size": 50 * 1024 * 1024, # 50MB
        "content_type": "video/mp4"
    }
    response = client.post("/api/v1/upload", json=init_payload)
    assert response.status_code == 201
    data = response.json()
    job_id = data["job_id"]
    assert job_id.startswith("job_")

    # 3. Confirm Upload
    confirm_payload = {"job_id": job_id}
    response = client.post("/api/v1/upload/confirm", json=confirm_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert data["celery_task_id"] == "task_123"

    # 4. Check Job Status
    response = client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert data["job_id"] == job_id
