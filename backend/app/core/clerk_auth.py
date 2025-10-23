"""clerk authentication utilities for fastapi."""

from typing import Any

import requests
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


class ClerkAuthError(Exception):
    """base exception for clerk authentication errors."""

    pass


class ClerkTokenExpiredError(ClerkAuthError):
    """raised when clerk token is expired."""

    pass


class ClerkTokenInvalidError(ClerkAuthError):
    """raised when clerk token is invalid."""

    pass


def get_clerk_jwks() -> dict[str, Any]:
    """fetch clerk's JWKS (JSON Web Key Set) for token verification.

    Returns:
        JWKS data containing public keys

    Raises:
        ClerkAuthError: if JWKS fetch fails
    """
    try:
        # clerk provides JWKS at a standard endpoint
        # format: https://api.clerk.com/v1/jwks or https://<your-domain>.clerk.accounts.dev/.well-known/jwks.json
        jwks_url = "https://api.clerk.com/v1/jwks"

        response = requests.get(
            jwks_url,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {settings.clerk_secret_key}",
            },
            timeout=10,
        )
        response.raise_for_status()

        return response.json()

    except requests.RequestException as e:
        logger.error("Failed to fetch Clerk JWKS", exc_info=e)
        raise ClerkAuthError(f"Failed to fetch JWKS: {e!s}") from e


def verify_clerk_token(token: str) -> dict[str, Any]:
    """verify and decode clerk JWT token.

    Args:
        token: clerk session token from authorization header

    Returns:
        decoded token payload containing:
            - sub: clerk user ID
            - email: user email (if available)
            - azp: authorized party (origin)
            - iat: issued at timestamp
            - exp: expiration timestamp

    Raises:
        ClerkTokenExpiredError: if token is expired
        ClerkTokenInvalidError: if token is invalid
    """
    try:
        # fetch JWKS from clerk
        jwks_data = get_clerk_jwks()

        # get the first key (clerk typically uses RS256)
        if not jwks_data.get("keys"):
            raise ClerkTokenInvalidError("No keys found in JWKS")

        # clerk uses RS256 algorithm
        # decode and verify the token
        # note: python-jose will automatically select the right key from JWKS

        # extract the public key
        public_key = jwks_data["keys"][0]

        # verify and decode token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_signature": True, "verify_aud": False},  # clerk doesn't use aud claim
        )

        logger.info(
            "Clerk token verified successfully",
            extra={"user_id": payload.get("sub"), "email": payload.get("email")},
        )

        return payload

    except ExpiredSignatureError as e:
        logger.warning("Clerk token expired", exc_info=e)
        raise ClerkTokenExpiredError("Token has expired") from e

    except (JWTError, JWTClaimsError) as e:
        logger.error("Clerk token verification failed", exc_info=e)
        raise ClerkTokenInvalidError(f"Invalid token: {e!s}") from e

    except Exception as e:
        logger.error("Unexpected error during Clerk token verification", exc_info=e)
        raise ClerkTokenInvalidError(f"Token verification failed: {e!s}") from e


def get_user_id_from_token(token: str) -> str:
    """extract clerk user ID from token.

    Args:
        token: clerk session token

    Returns:
        clerk user ID (sub claim)

    Raises:
        ClerkTokenInvalidError: if token is invalid or missing user ID
    """
    payload = verify_clerk_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise ClerkTokenInvalidError("Token missing user ID (sub claim)")

    return user_id


def decode_token_without_verification(token: str) -> dict[str, Any] | None:
    """decode clerk token without verification (for debugging only).

    Args:
        token: clerk session token

    Returns:
        decoded token payload or None if decoding fails
    """
    try:
        return jwt.decode(
            token,
            options={"verify_signature": False, "verify_aud": False},
        )
    except JWTError:
        return None
