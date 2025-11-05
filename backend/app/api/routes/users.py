"""User API routes for profile and settings management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.schemas import UserResponse, UserUpdateRequest
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user_clerk),
) -> UserResponse:
    """Get current user profile information.

    Args:
        current_user: authenticated user from dependency

    Returns:
        user profile information
    """
    logger.info("Fetching user profile", extra={"user_id": current_user.user_id})

    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        name=current_user.name,
        picture_url=current_user.picture_url,
        organization=current_user.organization,
        email_notifications=current_user.email_notifications,
        processing_notifications=current_user.processing_notifications,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdateRequest,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update current user profile information.

    Args:
        user_update: user update data
        current_user: authenticated user from dependency
        db: database session

    Returns:
        updated user profile information
    """
    logger.info("Updating user profile", extra={"user_id": current_user.user_id})

    # update fields if provided
    update_data = user_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    try:
        db.commit()
        db.refresh(current_user)
        logger.info(
            "User profile updated successfully",
            extra={"user_id": current_user.user_id, "updated_fields": list(update_data.keys())},
        )
    except Exception as e:
        db.rollback()
        logger.error("Failed to update user profile", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile",
        ) from e

    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        name=current_user.name,
        picture_url=current_user.picture_url,
        organization=current_user.organization,
        email_notifications=current_user.email_notifications,
        processing_notifications=current_user.processing_notifications,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )
