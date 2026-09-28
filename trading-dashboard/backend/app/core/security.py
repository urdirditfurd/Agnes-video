"""Chiffrement Fernet des secrets (clés API Binance)."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class SecretBox:
    """Chiffre / déchiffre des chaînes avec FERNET_KEY (env)."""

    def __init__(self, key: str | None = None) -> None:
        raw = (key or get_settings().fernet_key).encode("utf-8")
        self._fernet = Fernet(raw)

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        try:
            return self._fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("Impossible de déchiffrer le secret (FERNET_KEY incorrecte ?)") from exc


def get_secret_box() -> SecretBox:
    return SecretBox()
