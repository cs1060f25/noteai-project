"""user database model for authentication."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.models.database import Base


class User(Base):
    """user database model for authentication and authorization."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String(100), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4())
    )
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    picture_url = Column(String(500), nullable=True)

    # clerk authentication
    clerk_user_id = Column(String(255), unique=True, index=True, nullable=False)

    # status flags
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)

    # user preferences
    organization = Column(String(255), nullable=True)
    email_notifications = Column(Boolean, default=True, nullable=False)
    processing_notifications = Column(Boolean, default=True, nullable=False)

    # timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # relationships
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """convert model to dictionary.

        Returns:
            dictionary representation of the user
        """
        return {
            "user_id": self.user_id,
            "email": self.email,
            "name": self.name,
            "picture_url": self.picture_url,
            "clerk_user_id": self.clerk_user_id,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "organization": self.organization,
            "email_notifications": self.email_notifications,
            "processing_notifications": self.processing_notifications,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login_at": self.last_login_at,
        }
