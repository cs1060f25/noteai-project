"""storage tracking service for user storage management."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models.database import Clip, Job
from app.models.user import User

logger = get_logger(__name__)


class StorageService:
    """service for tracking and managing user storage."""

    def __init__(self, db: Session):
        """initialize storage service.

        Args:
            db: database session
        """
        self.db = db

    def calculate_user_storage(self, user_id: str) -> int:
        """calculate total storage used by a user.

        Includes:
        - Original uploaded videos (from jobs table)
        - Generated clips (from clips table)
        - Compiled highlight videos (from jobs table)

        Args:
            user_id: user identifier

        Returns:
            total storage in bytes
        """
        # sum of original video file sizes
        original_videos_size = (
            self.db.query(func.sum(Job.file_size)).filter(Job.user_id == user_id).scalar() or 0
        )

        # sum of clip file sizes
        clips_size = (
            self.db.query(func.sum(Clip.file_size_bytes))
            .join(Job, Clip.job_id == Job.job_id)
            .filter(Job.user_id == user_id)
            .filter(Clip.file_size_bytes.isnot(None))
            .scalar()
            or 0
        )

        total_storage = original_videos_size + clips_size

        logger.debug(
            "Calculated user storage",
            extra={
                "user_id": user_id,
                "original_videos_bytes": original_videos_size,
                "clips_bytes": clips_size,
                "total_bytes": total_storage,
            },
        )

        return total_storage

    def update_user_storage(self, user_id: str) -> int:
        """recalculate and update user's storage_used_bytes field.

        Args:
            user_id: user identifier

        Returns:
            updated storage value in bytes
        """
        total_storage = self.calculate_user_storage(user_id)

        # update user record
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.storage_used_bytes = total_storage
            self.db.commit()

            logger.info(
                "Updated user storage tracking",
                extra={"user_id": user_id, "storage_bytes": total_storage},
            )
        else:
            logger.warning("User not found for storage update", extra={"user_id": user_id})

        return total_storage

    def increment_user_storage(self, user_id: str, size_bytes: int) -> None:
        """incrementally add to user's storage without full recalculation.

        More efficient for adding individual clips.

        Args:
            user_id: user identifier
            size_bytes: bytes to add (use negative for deletion)
        """
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.storage_used_bytes = (user.storage_used_bytes or 0) + size_bytes
            self.db.commit()

            logger.debug(
                "Incremented user storage",
                extra={
                    "user_id": user_id,
                    "size_delta_bytes": size_bytes,
                    "new_total_bytes": user.storage_used_bytes,
                },
            )
        else:
            logger.warning("User not found for storage increment", extra={"user_id": user_id})

    def get_user_storage(self, user_id: str) -> int:
        """get user's current storage from cached value.

        Args:
            user_id: user identifier

        Returns:
            storage in bytes (returns 0 if user not found)
        """
        user = self.db.query(User).filter(User.user_id == user_id).first()
        return user.storage_used_bytes if user else 0
