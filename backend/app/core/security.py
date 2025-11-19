"""Security utilities and helpers."""

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from cryptography.fernet import Fernet


def encrypt_string(value: str, secret: str) -> str:
    """Encrypt a string using Fernet.

    Args:
        value: String to encrypt
        secret: Secret key (must be 32 url-safe base64-encoded bytes)

    Returns:
        Encrypted string
    """
    f = Fernet(secret)
    return f.encrypt(value.encode()).decode()


def decrypt_string(value: str, secret: str) -> str:
    """Decrypt a string using Fernet.

    Args:
        value: Encrypted string
        secret: Secret key

    Returns:
        Decrypted string
    """
    f = Fernet(secret)
    return f.decrypt(value.encode()).decode()


def generate_random_string(length: int = 32) -> str:
    """Generate a cryptographically secure random string.

    Args:
        length: Length of the string to generate

    Returns:
        Random hex string
    """
    return secrets.token_hex(length // 2)


def generate_job_id() -> str:
    """Generate a unique job ID.

    Returns:
        Unique job identifier
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    random_part = generate_random_string(8)
    return f"job_{timestamp}_{random_part}"


def hash_string(value: str, salt: str | None = None) -> str:
    """Hash a string using SHA-256.

    Args:
        value: String to hash
        salt: Optional salt

    Returns:
        Hex digest of the hash
    """
    if salt:
        value = f"{value}{salt}"
    return hashlib.sha256(value.encode()).hexdigest()


def verify_signature(data: str, signature: str, secret: str) -> bool:
    """Verify HMAC signature.

    Args:
        data: Data that was signed
        signature: Signature to verify
        secret: Secret key used for signing

    Returns:
        True if signature is valid, False otherwise
    """
    expected_signature = hmac.new(
        secret.encode(),
        data.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Remove directory separators and other dangerous characters
    dangerous_chars = ["/", "\\", "..", "\x00"]
    for char in dangerous_chars:
        filename = filename.replace(char, "")

    # Limit length
    max_length = 255
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        name = name[: max_length - len(ext) - 1]
        filename = f"{name}.{ext}" if ext else name

    return filename


def validate_file_extension(filename: str, allowed_extensions: list[str]) -> bool:
    """Validate file extension against allowed list.

    Args:
        filename: Filename to check
        allowed_extensions: List of allowed extensions (e.g., ['.mp4', '.mov'])

    Returns:
        True if extension is allowed, False otherwise
    """
    filename_lower = filename.lower()
    return any(filename_lower.endswith(ext.lower()) for ext in allowed_extensions)
