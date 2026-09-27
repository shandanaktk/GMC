from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from cryptography.fernet import Fernet, InvalidToken
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .models import UserSession


def _fernet(settings: Settings | None = None) -> Fernet:
    value = (settings or get_settings()).secret_key.encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(value).digest())
    return Fernet(key)


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("ascii")


def decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Stored credential could not be decrypted. Check SECRET_KEY.") from exc


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, user_id: str) -> tuple[str, UserSession]:
    settings = get_settings()
    raw_token = secrets.token_urlsafe(48)
    session = UserSession(
        user_id=user_id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.session_days),
    )
    db.add(session)
    db.commit()
    return raw_token, session


def get_session(db: Session, raw_token: str | None) -> UserSession | None:
    if not raw_token:
        return None
    now = datetime.now(timezone.utc)
    session = db.scalar(select(UserSession).where(UserSession.token_hash == hash_token(raw_token)))
    if not session:
        return None
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        db.delete(session)
        db.commit()
        return None
    session.last_seen_at = now
    db.commit()
    return session


def delete_session(db: Session, raw_token: str | None) -> None:
    if raw_token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(raw_token)))
        db.commit()


def sign_oauth_state(payload: dict) -> str:
    return URLSafeTimedSerializer(get_settings().secret_key, salt="google-oauth-state").dumps(payload)


def read_oauth_state(state: str, max_age: int = 600) -> dict:
    try:
        return URLSafeTimedSerializer(get_settings().secret_key, salt="google-oauth-state").loads(state, max_age=max_age)
    except (BadSignature, SignatureExpired) as exc:
        raise ValueError("OAuth state is invalid or expired") from exc

