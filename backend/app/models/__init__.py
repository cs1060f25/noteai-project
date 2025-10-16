"""database models."""

# import all models here to ensure they are registered with SQLAlchemy
# and relationships can be resolved properly
from app.models.user import User  # Import User first
from app.models.database import (  # Then import Job (which references User)
    Base,
    Clip,
    ContentSegment,
    Job,
    LayoutAnalysis,
    ProcessingLog,
    SilenceRegion,
    Transcript,
)

__all__ = [
    "Base",
    "User",
    "Job",
    "Transcript",
    "SilenceRegion",
    "LayoutAnalysis",
    "ContentSegment",
    "Clip",
    "ProcessingLog",
]
