"""Tests for security utilities."""

from cryptography.fernet import Fernet

from app.core.security import decrypt_string, encrypt_string


def test_encryption_decryption():
    """Test that encryption and decryption work correctly."""
    # Generate a valid Fernet key
    secret = Fernet.generate_key().decode()
    original_text = "my-secret-api-key"

    # Encrypt
    encrypted = encrypt_string(original_text, secret)
    assert encrypted != original_text
    assert len(encrypted) > 0

    # Decrypt
    decrypted = decrypt_string(encrypted, secret)
    assert decrypted == original_text


def test_encryption_randomness():
    """Test that encrypting the same value twice produces different results (IV)."""
    secret = Fernet.generate_key().decode()
    text = "same-text"

    encrypted1 = encrypt_string(text, secret)
    encrypted2 = encrypt_string(text, secret)

    assert encrypted1 != encrypted2
    assert decrypt_string(encrypted1, secret) == text
    assert decrypt_string(encrypted2, secret) == text
