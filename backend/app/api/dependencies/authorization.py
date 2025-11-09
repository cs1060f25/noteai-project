"""authorization dependencies for role-based access control."""

from fastapi import Depends, HTTPException, status

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.logging import get_logger
from app.models.user import User, UserRole

logger = get_logger(__name__)


async def require_admin(
    current_user: User = Depends(get_current_user_clerk),
) -> User:
    """require admin role for endpoint access.

    Args:
        current_user: authenticated user from clerk

    Returns:
        user object if user is admin

    Raises:
        HTTPException: 403 if user is not admin
    """
    if current_user.role != UserRole.ADMIN:
        logger.warning(
            "Unauthorized admin access attempt",
            extra={
                "user_id": current_user.user_id,
                "role": current_user.role.value if current_user.role else None,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "ADMIN_ACCESS_REQUIRED",
                    "message": "Admin access required for this endpoint",
                }
            },
        )

    logger.debug(
        "Admin access granted",
        extra={"user_id": current_user.user_id},
    )

    return current_user
