"""clerk authentication dependencies for fastapi routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.clerk_auth import (
    ClerkAuthError,
    ClerkTokenExpiredError,
    ClerkTokenInvalidError,
    verify_clerk_token,
)
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.user import User, UserRole

logger = get_logger(__name__)

# http bearer security scheme
clerk_security = HTTPBearer(auto_error=False)


async def get_current_user_clerk(
    credentials: HTTPAuthorizationCredentials | None = Depends(clerk_security),
    db: Session = Depends(get_db),
) -> User:
    """get current authenticated user from clerk session token.

    Args:
        credentials: http authorization credentials with bearer token
        db: database session

    Returns:
        authenticated user

    Raises:
        HTTPException: if authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # verify and decode clerk token
        payload = verify_clerk_token(token)
        clerk_user_id: str | None = payload.get("sub")

        if clerk_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except ClerkTokenExpiredError as e:
        logger.warning("Expired token", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    except ClerkTokenInvalidError as e:
        logger.error("Invalid token", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    except ClerkAuthError as e:
        logger.error("Clerk authentication error", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        ) from e

    # fetch user from database using clerk_user_id
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()

    if user is None:
        # user doesn't exist in our database, we should create them
        # this happens on first login after clerk authentication
        logger.info(
            "Creating new user from Clerk authentication", extra={"clerk_user_id": clerk_user_id}
        )

        # fetch user details from clerk API
        import requests

        from app.core.settings import settings

        try:
            clerk_response = requests.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={
                    "Authorization": f"Bearer {settings.clerk_secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            clerk_response.raise_for_status()
            clerk_user_data = clerk_response.json()

            # extract email from clerk user data
            email_addresses = clerk_user_data.get("email_addresses", [])
            primary_email = None

            for email_obj in email_addresses:
                if email_obj.get("id") == clerk_user_data.get("primary_email_address_id"):
                    primary_email = email_obj.get("email_address")
                    break

            if not primary_email and email_addresses:
                primary_email = email_addresses[0].get("email_address")

            if not primary_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No email address found for user",
                )

            # extract name and profile image
            first_name = clerk_user_data.get("first_name", "")
            last_name = clerk_user_data.get("last_name", "")
            name = f"{first_name} {last_name}".strip() or None
            picture_url = clerk_user_data.get("image_url")

            # extract role from public metadata
            public_metadata = clerk_user_data.get("public_metadata", {})
            role_str = public_metadata.get("role", "user")

            # validate and convert role to enum
            try:
                role = UserRole(role_str) if role_str in ["user", "admin"] else UserRole.USER
            except ValueError:
                logger.warning(
                    "Invalid role in Clerk metadata, defaulting to user",
                    extra={"clerk_user_id": clerk_user_id, "role": role_str},
                )
                role = UserRole.USER

        except requests.RequestException as e:
            logger.error("Failed to fetch user from Clerk API", exc_info=e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user details from authentication service",
            ) from e

        # check if user with this email already exists
        # this can happen if user previously logged in with a different clerk account
        # or if their clerk account was recreated
        existing_user = db.query(User).filter(User.email == primary_email).first()

        if existing_user:
            # update existing user's clerk_user_id and role
            logger.info(
                "User with email exists, updating clerk_user_id",
                extra={
                    "user_id": existing_user.user_id,
                    "email": primary_email,
                    "old_clerk_user_id": existing_user.clerk_user_id,
                    "new_clerk_user_id": clerk_user_id,
                },
            )
            existing_user.clerk_user_id = clerk_user_id
            existing_user.name = name
            existing_user.picture_url = picture_url
            existing_user.role = role
            db.commit()
            db.refresh(existing_user)
            user = existing_user
        else:
            # create new user
            from uuid import uuid4

            user = User(
                user_id=str(uuid4()),
                clerk_user_id=clerk_user_id,
                email=primary_email,
                name=name,
                picture_url=picture_url,
                role=role,
                is_active=True,
                is_verified=True,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            logger.info(
                "New user created",
                extra={"user_id": user.user_id, "email": primary_email, "role": role.value},
            )

    # for existing users (who were not just created), sync role from clerk on each login
    # this ensures role changes in clerk are reflected in our database
    if user and user.id:  # user.id exists means it's an existing user from db
        try:
            import requests

            from app.core.settings import settings

            clerk_response = requests.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={
                    "Authorization": f"Bearer {settings.clerk_secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=5,
            )

            if clerk_response.status_code == 200:
                clerk_user_data = clerk_response.json()
                public_metadata = clerk_user_data.get("public_metadata", {})
                role_str = public_metadata.get("role", "user")

                try:
                    new_role = (
                        UserRole(role_str) if role_str in ["user", "admin"] else UserRole.USER
                    )
                    if user.role != new_role:
                        logger.info(
                            "Updating user role from Clerk metadata",
                            extra={
                                "user_id": user.user_id,
                                "old_role": user.role.value if user.role else None,
                                "new_role": new_role.value,
                            },
                        )
                        user.role = new_role
                except ValueError:
                    pass  # keep existing role if invalid

        except Exception as e:
            # don't fail login if role sync fails, just log the error
            logger.warning(
                "Failed to sync role from Clerk, keeping existing role",
                extra={"user_id": user.user_id},
                exc_info=e,
            )

    if not user.is_active:
        logger.warning("Inactive user attempted access", extra={"user_id": user.user_id})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # update last login
    from datetime import datetime, timezone

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    return user


async def get_current_active_user_clerk(
    current_user: User = Depends(get_current_user_clerk),
) -> User:
    """get current active user (alias for get_current_user_clerk with explicit check).

    Args:
        current_user: user from get_current_user_clerk dependency

    Returns:
        active user

    Raises:
        HTTPException: if user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


async def get_optional_user_clerk(
    credentials: HTTPAuthorizationCredentials | None = Depends(clerk_security),
    db: Session = Depends(get_db),
) -> User | None:
    """get current user if authenticated, otherwise return None.

    useful for endpoints that work with or without authentication.

    Args:
        credentials: http authorization credentials with bearer token
        db: database session

    Returns:
        authenticated user or None
    """
    if not credentials:
        return None

    try:
        return await get_current_user_clerk(credentials, db)
    except HTTPException:
        return None
