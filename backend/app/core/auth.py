"""authentication utilities for JWT and OAuth."""

from datetime import datetime, timedelta
from typing import Any

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jose import JWTError, jwt

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """create JWT access token.

    Args:
        data: payload data to encode in the token
        expires_delta: optional custom expiration time

    Returns:
        encoded JWT access token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
        }
    )

    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """create JWT refresh token.

    Args:
        data: payload data to encode in the token
        expires_delta: optional custom expiration time

    Returns:
        encoded JWT refresh token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
        }
    )

    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> dict[str, Any]:
    """verify and decode JWT token.

    Args:
        token: JWT token to verify
        token_type: expected token type ("access" or "refresh")

    Returns:
        decoded token payload

    Raises:
        JWTError: if token is invalid or expired
        ValueError: if token type doesn't match expected type
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        # verify token type
        if payload.get("type") != token_type:
            raise ValueError(f"Invalid token type. Expected {token_type}, got {payload.get('type')}")

        return payload

    except JWTError as e:
        logger.error("JWT verification failed", exc_info=e)
        raise


def verify_google_token(credential: str) -> dict[str, Any]:
    """verify Google ID token.

    Args:
        credential: Google ID token (JWT) from OAuth flow

    Returns:
        decoded token information including:
            - sub: Google user ID
            - email: user email
            - name: user full name
            - picture: profile picture URL
            - email_verified: whether email is verified

    Raises:
        ValueError: if token is invalid or verification fails
    """
    try:
        # verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )

        # verify issuer
        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid token issuer")

        # verify audience (client ID)
        if idinfo["aud"] != settings.google_client_id:
            raise ValueError("Invalid token audience")

        logger.info(
            "Google token verified successfully",
            extra={"google_id": idinfo.get("sub"), "email": idinfo.get("email")},
        )

        return idinfo

    except ValueError as e:
        logger.error("Google token verification failed", exc_info=e)
        raise


def get_token_payload(token: str) -> dict[str, Any] | None:
    """decode token without verification (for debugging).

    Args:
        token: JWT token to decode

    Returns:
        decoded token payload or None if decoding fails
    """
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"verify_signature": False},
        )
    except JWTError:
        return None
