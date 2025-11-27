from locust import HttpUser, task, between
import random

class NoteAIUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        # Log in (if needed) or set up headers
        # For now, we assume we can use a dummy token or public endpoints if available
        # But our API requires authentication.
        # We would need to obtain a token.
        # Since we can't easily get a real Clerk token, we might need to mock auth or use a test token if the backend supports it.
        # For this example, we'll assume a header is sufficient if we were running against a dev env with disabled auth or test token.
        self.client.headers = {"Authorization": "Bearer test_token"}

    @task(3)
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/stats")
        self.client.get("/api/v1/jobs")

    @task(1)
    def view_user_profile(self):
        self.client.get("/api/v1/users/me")

    @task(1)
    def upload_flow(self):
        # Simulate upload initiation
        filename = f"test_{random.randint(1000, 9999)}.mp4"
        response = self.client.post("/api/v1/upload", json={
            "filename": filename,
            "file_size": 1024 * 1024,
            "content_type": "video/mp4"
        })
        if response.status_code == 201:
            job_id = response.json()["job_id"]
            # Simulate confirmation (skip actual S3 upload)
            self.client.post("/api/v1/upload/confirm", json={"job_id": job_id})
