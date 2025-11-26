"""API routes for managing user API keys."""

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk as get_current_user
from app.core.database import get_db
from app.core.rate_limit_config import limiter
from app.core.security import decrypt_string, encrypt_string
from app.core.settings import settings
from app.models.user import User

router = APIRouter(prefix="/users/api-keys", tags=["User API Keys"])


class APIKeyRequest(BaseModel):
    """Request model for storing API key."""

    api_key: str


class APIKeyStatusResponse(BaseModel):
    """Response model for API key status."""

    has_api_key: bool
    masked_key: str | None = None


class APIKeyValidationRequest(BaseModel):
    """Request model for validating API key."""

    api_key: str


class APIKeyValidationResponse(BaseModel):
    """Response model for API key validation."""

    is_valid: bool
    message: str


@router.post("", response_model=APIKeyStatusResponse)
@limiter.limit("10/minute")
async def store_api_key(
    request: Request,
    response: Response,
    api_key_request: APIKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> APIKeyStatusResponse:
    """Store or update user's Gemini API key.

    Args:
        request: Request object
        response: Response object
        api_key_request: API key request
        current_user: Current authenticated user
        db: Database session

    Returns:
        API key status
    """
    if not settings.api_key_encryption_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key encryption is not configured",
        )

    try:
        # Validate key before storing
        genai.configure(api_key=api_key_request.api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        # Simple generation to test the key
        model.generate_content("Hello")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid API key: {e!s}",
        ) from e

    try:
        encrypted_key = encrypt_string(api_key_request.api_key, settings.api_key_encryption_secret)
        current_user.gemini_api_key_encrypted = encrypted_key
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store API key: {e!s}",
        ) from e

    return APIKeyStatusResponse(
        has_api_key=True,
        masked_key=(
            f"sk-...{api_key_request.api_key[-6:]}"
            if len(api_key_request.api_key) > 6
            else "sk-..."
        ),
    )


@router.get("/status", response_model=APIKeyStatusResponse)
@limiter.limit("20/minute")
async def get_api_key_status(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
) -> APIKeyStatusResponse:
    """Check if user has a stored API key.

    Args:
        request: Request object
        response: Response object
        current_user: Current authenticated user

    Returns:
        API key status
    """
    if not current_user.gemini_api_key_encrypted:
        return APIKeyStatusResponse(has_api_key=False)

    if not settings.api_key_encryption_secret:
        # If secret is missing but key exists, we can't decrypt it to show masked version
        # but we know it exists.
        return APIKeyStatusResponse(has_api_key=True, masked_key="Error: Encryption secret missing")

    try:
        decrypted_key = decrypt_string(
            current_user.gemini_api_key_encrypted, settings.api_key_encryption_secret
        )
        masked = f"sk-...{decrypted_key[-6:]}" if len(decrypted_key) > 6 else "sk-..."
        return APIKeyStatusResponse(has_api_key=True, masked_key=masked)
    except Exception:
        return APIKeyStatusResponse(has_api_key=True, masked_key="Error: Decryption failed")


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def delete_api_key(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove stored API key.

    Args:
        request: Request object
        response: Response object
        current_user: Current authenticated user
        db: Database session
    """
    current_user.gemini_api_key_encrypted = None
    db.commit()


@router.post("/validate", response_model=APIKeyValidationResponse)
@limiter.limit("5/minute")
async def validate_api_key(
    request: Request,
    response: Response,
    api_key_request: APIKeyValidationRequest,
    current_user: User = Depends(get_current_user),
) -> APIKeyValidationResponse:
    """Validate an API key against Gemini API.

    Args:
        request: Request object
        response: Response object
        api_key_request: API key validation request
        current_user: Current authenticated user

    Returns:
        Validation result
    """
    try:
        genai.configure(api_key=api_key_request.api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content("Hello")
        if response:
            return APIKeyValidationResponse(is_valid=True, message="API key is valid")
        return APIKeyValidationResponse(is_valid=False, message="API key validation failed")
    except Exception as e:
        return APIKeyValidationResponse(is_valid=False, message=f"Invalid API key: {e!s}")
