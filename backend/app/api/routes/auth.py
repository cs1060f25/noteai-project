"""authentication routes for google oauth and jwt."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.auth import (
    create_access_token,
    create_refresh_token,
    verify_google_token,
    verify_token,
)
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.user import User
from app.schemas.user import (
    GoogleLoginRequest,
    TokenRefreshRequest,
    TokenRefreshResponse,
    TokenResponse,
    UserResponse,
)

logger = get_logger(__name__)

router = APIRouter()


@router.post("/google", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.rate_limit_auth_login)
async def google_login(
    request: Request,
    credentials: GoogleLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """authenticate user with google oauth and return jwt tokens.

    Args:
        request: google login request with id token
        db: database session

    Returns:
        jwt tokens and user information

    Raises:
        HTTPException: if google token verification fails
    """
    try:
        # verify google token
        google_user_info = verify_google_token(credentials.credential)

        google_id = google_user_info["sub"]
        email = google_user_info["email"]
        name = google_user_info.get("name")
        picture = google_user_info.get("picture")

        logger.info("Google token verified", extra={"email": email, "google_id": google_id})

        # check if user exists
        user = db.query(User).filter(User.google_id == google_id).first()

        if user is None:
            # create new user
            user = User(
                user_id=str(uuid.uuid4()),
                email=email,
                name=name,
                picture_url=picture,
                google_id=google_id,
                is_active=True,
                is_verified=True,
                last_login_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info("New user created", extra={"user_id": user.user_id, "email": email})
        else:
            # update existing user
            user.name = name
            user.picture_url = picture
            user.last_login_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
            logger.info("Existing user logged in", extra={"user_id": user.user_id, "email": email})

        # create tokens
        token_data = {"sub": user.user_id, "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )

    except ValueError as e:
        logger.error("Google token verification failed", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials",
        ) from e
    except Exception as e:
        logger.error("Login failed", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        ) from e


@router.post("/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
@limiter.limit(settings.rate_limit_auth_refresh)
async def refresh_access_token(
    request: Request,
    refresh_request: TokenRefreshRequest,
    db: Session = Depends(get_db),
) -> TokenRefreshResponse:
    """refresh access token using refresh token.

    Args:
        request: token refresh request with refresh token
        db: database session

    Returns:
        new access token

    Raises:
        HTTPException: if refresh token is invalid
    """
    try:
        # verify refresh token
        payload = verify_token(refresh_request.refresh_token, token_type="refresh")
        user_id: str | None = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        # check if user exists and is active
        user = db.query(User).filter(User.user_id == user_id).first()

        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # create new access token
        token_data = {"sub": user.user_id, "email": user.email}
        access_token = create_access_token(token_data)

        logger.info("Access token refreshed", extra={"user_id": user_id})

        return TokenRefreshResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    except ValueError as e:
        logger.error("Invalid refresh token type", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from e
    except Exception as e:
        logger.error("Token refresh failed", exc_info=e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed",
        ) from e


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """get current authenticated user information.

    Args:
        current_user: current authenticated user from dependency

    Returns:
        user information
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """logout current user.

    note: jwt tokens are stateless, so logout is handled on the frontend
    by removing tokens from storage. this endpoint exists for logging purposes
    and potential future token blacklisting.

    Args:
        current_user: current authenticated user from dependency

    Returns:
        success message
    """
    logger.info("User logged out", extra={"user_id": current_user.user_id})
    return {"message": "Logged out successfully"}
