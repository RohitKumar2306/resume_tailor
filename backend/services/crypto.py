import os
from cryptography.fernet import Fernet, InvalidToken

_fernet_key = os.getenv("FERNET_KEY", "")
if _fernet_key:
    cipher = Fernet(_fernet_key.encode())
else:
    cipher = None


def encrypt_api_key(raw: str) -> str:
    if not cipher:
        raise ValueError("FERNET_KEY is not configured")
    try:
        return cipher.encrypt(raw.encode()).decode()
    except Exception as e:
        raise ValueError(f"Encryption failed: {e}")


def decrypt_api_key(enc: str) -> str:
    if not cipher:
        raise ValueError("FERNET_KEY is not configured")
    try:
        return cipher.decrypt(enc.encode()).decode()
    except InvalidToken:
        raise ValueError("Decryption failed: invalid token or key")
    except Exception as e:
        raise ValueError(f"Decryption failed: {e}")
