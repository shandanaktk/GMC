from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import OAuthCredential
from .security import decrypt_secret, encrypt_secret


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
MERCHANT_API = "https://merchantapi.googleapis.com"
GOOGLE_SCOPES = (
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/content",
)


class GoogleApiError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class GoogleClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    def authorization_url(self, state: str) -> str:
        if not self.settings.google_client_id or not self.settings.google_client_secret:
            raise GoogleApiError("Google OAuth is not configured", 503)
        params = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": self.settings.oauth_redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent select_account",
            "state": state,
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    def exchange_code(self, code: str) -> dict:
        response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": self.settings.google_client_id,
                "client_secret": self.settings.google_client_secret,
                "redirect_uri": self.settings.oauth_redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=self.settings.request_timeout_seconds,
        )
        return self._json_or_error(response, "Google token exchange failed")

    def user_info(self, access_token: str) -> dict:
        response = httpx.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=self.settings.request_timeout_seconds,
        )
        return self._json_or_error(response, "Google user profile request failed")

    def save_credential(self, db: Session, user_id: str, tokens: dict) -> OAuthCredential:
        credential = db.scalar(select(OAuthCredential).where(OAuthCredential.user_id == user_id))
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
        scopes = tokens.get("scope", " ".join(GOOGLE_SCOPES))
        if credential is None:
            refresh = tokens.get("refresh_token")
            if not refresh:
                raise GoogleApiError("Google did not return offline access. Revoke the app grant and connect again.", 400)
            credential = OAuthCredential(
                user_id=user_id,
                access_token_encrypted=encrypt_secret(tokens["access_token"]),
                refresh_token_encrypted=encrypt_secret(refresh),
                token_expires_at=expires_at,
                scopes=scopes,
            )
            db.add(credential)
        else:
            credential.access_token_encrypted = encrypt_secret(tokens["access_token"])
            if tokens.get("refresh_token"):
                credential.refresh_token_encrypted = encrypt_secret(tokens["refresh_token"])
            credential.token_expires_at = expires_at
            credential.scopes = scopes
        db.flush()
        return credential

    def access_token(self, db: Session, user_id: str) -> str:
        credential = db.scalar(select(OAuthCredential).where(OAuthCredential.user_id == user_id))
        if credential is None:
            raise GoogleApiError("Google connection not found", 401)
        expiry = credential.token_expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry > datetime.now(timezone.utc) + timedelta(minutes=2):
            token = decrypt_secret(credential.access_token_encrypted)
            if token:
                return token
        refresh_token = decrypt_secret(credential.refresh_token_encrypted)
        if not refresh_token:
            raise GoogleApiError("Google refresh token is missing. Connect the account again.", 401)
        response = httpx.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": self.settings.google_client_id,
                "client_secret": self.settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=self.settings.request_timeout_seconds,
        )
        tokens = self._json_or_error(response, "Google access token refresh failed")
        self.save_credential(db, user_id, tokens)
        db.commit()
        return tokens["access_token"]

    def list_accounts(self, access_token: str) -> list[dict]:
        return self._list_all(
            f"{MERCHANT_API}/accounts/v1/accounts",
            access_token,
            "accounts",
            {"pageSize": 500},
        )

    def register_project(self, access_token: str, merchant_id: str, developer_email: str) -> dict:
        if not merchant_id or not developer_email:
            raise GoogleApiError("Google developer registration requires a primary Merchant ID and developer email", 503)
        response = httpx.post(
            f"{MERCHANT_API}/accounts/v1/accounts/{merchant_id}/developerRegistration:registerGcp",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"developerEmail": developer_email},
            timeout=self.settings.request_timeout_seconds,
        )
        return self._json_or_error(response, "Google Merchant API developer registration failed")

    def get_homepage(self, access_token: str, merchant_id: str) -> dict:
        return self._get(
            f"{MERCHANT_API}/accounts/v1/accounts/{merchant_id}/homepage",
            access_token,
            allow_not_found=True,
        )

    def list_account_issues(self, access_token: str, merchant_id: str) -> list[dict]:
        return self._list_all(
            f"{MERCHANT_API}/accounts/v1/accounts/{merchant_id}/issues",
            access_token,
            "accountIssues",
            {"pageSize": 1000, "languageCode": "en-US"},
        )

    def list_products(self, access_token: str, merchant_id: str) -> list[dict]:
        return self._list_all(
            f"{MERCHANT_API}/products/v1/accounts/{merchant_id}/products",
            access_token,
            "products",
            {"pageSize": 1000},
            limit=self.settings.audit_max_products,
        )

    def _list_all(
        self,
        url: str,
        access_token: str,
        collection_key: str,
        params: dict,
        limit: int | None = None,
    ) -> list[dict]:
        items: list[dict] = []
        page_token: str | None = None
        with httpx.Client(timeout=self.settings.request_timeout_seconds) as client:
            while True:
                request_params = dict(params)
                if page_token:
                    request_params["pageToken"] = page_token
                response = client.get(
                    url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=request_params,
                )
                data = self._json_or_error(response, f"Google Merchant API request failed for {collection_key}")
                items.extend(data.get(collection_key, []))
                if limit and len(items) >= limit:
                    return items[:limit]
                page_token = data.get("nextPageToken")
                if not page_token:
                    return items

    def _get(self, url: str, access_token: str, allow_not_found: bool = False) -> dict:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=self.settings.request_timeout_seconds,
        )
        if allow_not_found and response.status_code == 404:
            return {}
        return self._json_or_error(response, "Google Merchant API request failed")

    @staticmethod
    def _json_or_error(response: httpx.Response, context: str) -> dict:
        try:
            data = response.json()
        except ValueError:
            data = {}
        if response.is_error:
            detail = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
            raise GoogleApiError(f"{context}: {detail or response.reason_phrase}", response.status_code)
        return data

