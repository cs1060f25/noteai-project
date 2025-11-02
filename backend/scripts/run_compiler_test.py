# scripts/run_compiler_test.py
"""
Temporary test runner for VideoCompiler that keeps its outputs.
"""

import tempfile
from pathlib import Path
import shutil
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.settings import settings
from agents.compiler import VideoCompiler
from app.models import Job, ContentSegment
from app.models.user import User

# --------------------------------------------------------------------
# 1️⃣  Connect to the database
# --------------------------------------------------------------------
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()
db.rollback()

# --------------------------------------------------------------------
# 2️⃣  Patch tempfile so outputs are kept in /app/output_debug
# --------------------------------------------------------------------
outdir = Path("/app/output_debug")
outdir.mkdir(parents=True, exist_ok=True)

def keep_tempdir():
    class Dummy:
        name = str(outdir)
        def __enter__(self): return self.name
        def __exit__(self, *a): pass  # don’t delete
    return Dummy()

tempfile.TemporaryDirectory = keep_tempdir
print("✅ Patched tempfile.TemporaryDirectory to persist outputs")

# --------------------------------------------------------------------
# 3️⃣  Create or update a test job and segments
# --------------------------------------------------------------------
job_id = "job_testlec"

# Ensure mock user exists
user = db.query(User).filter(User.user_id == "local_test_user").first()
if not user:
    user = User(
        user_id="local_test_user",
        email="tester@example.com",
        name="Local Tester",
        clerk_user_id="clerk_mock_123",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
print("✅ Mock user ready")

# Clean up any existing records for this job
from app.models import Clip, ContentSegment, Job
db.query(Clip).filter(Clip.job_id == job_id).delete()
db.query(ContentSegment).filter(ContentSegment.job_id == job_id).delete()
db.query(Job).filter(Job.job_id == job_id).delete()
db.commit()

# Create a new Job
job = Job(
    job_id=job_id,
    user_id="local_test_user",
    filename="test_lec.mov",
    file_size=6000000,
    content_type="video/quicktime",
    original_s3_key="dummy.mov",
    status="ready",
    current_stage="compilation",
    progress_percent=0.0,
    progress_message="Testing compiler output persistence",
)
db.add(job)
db.commit()
print("✅ Job created")

# Add three sample segments
segments = [
    ContentSegment(
        job_id=job_id,
        segment_id="seg_testlec_1",
        start_time=0,
        end_time=30,
        duration=30.0,
        topic="Intro",
        description="First 30 seconds",
        importance_score=1.0,
        segment_order=0,
        created_at=datetime.utcnow(),
    ),
    ContentSegment(
        job_id=job_id,
        segment_id="seg_testlec_2",
        start_time=60,
        end_time=90,
        duration=30.0,
        topic="Middle",
        description="Middle highlight",
        importance_score=0.9,
        segment_order=1,
        created_at=datetime.utcnow(),
    ),
    ContentSegment(
        job_id=job_id,
        segment_id="seg_testlec_3",
        start_time=120,
        end_time=150,
        duration=30.0,
        topic="Conclusion",
        description="Closing highlight",
        importance_score=0.8,
        segment_order=2,
        created_at=datetime.utcnow(),
    ),
]
db.add_all(segments)
db.commit()
print("✅ Added", len(segments), "segments")

# --------------------------------------------------------------------
# 4️⃣  Run the compiler using your real test video
# --------------------------------------------------------------------
compiler = VideoCompiler(db)
compiler._download_from_s3 = lambda s3_key, local_path: shutil.copy("/tmp/test_lec.mov", local_path)
compiler._upload_to_s3 = lambda local_path, s3_key, content_type: None

result = compiler.compile_clips(job_id)
print("✅ Compilation completed!")
print(result)

print("\n🎬 Outputs saved to:", outdir)
