"""user pydantic schemas for authentication."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """base user schema."""

    email: EmailStr = Field(..., description="User email address")
    name: str | None = Field(None, description="User full name")
    picture_url: str | None = Field(None, description="User profile picture URL")


class UserCreate(UserBase):
    """user creation schema."""

    google_id: str = Field(..., description="Google account ID")


class UserUpdate(BaseModel):
    """user update schema."""

    name: str | None = Field(None, description="User full name")
    picture_url: str | None = Field(None, description="User profile picture URL")


class UserResponse(UserBase):
    """user response schema."""

    user_id: str = Field(..., description="Unique user identifier")
    google_id: str = Field(..., description="Google account ID")
    is_active: bool = Field(..., description="Whether user is active")
    is_verified: bool = Field(..., description="Whether user is verified")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login_at: datetime | None = Field(None, description="Last login timestamp")

    class Config:
        """pydantic config."""

        from_attributes = True


class GoogleLoginRequest(BaseModel):
    """google OAuth login request."""

    credential: str = Field(..., description="Google ID token (JWT credential)")


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiry in seconds")
    user: UserResponse = Field(..., description="User information")


class TokenRefreshRequest(BaseModel):
    """token refresh request."""

    refresh_token: str = Field(..., description="JWT refresh token")


class TokenRefreshResponse(BaseModel):
    """token refresh response."""

    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiry in seconds")
