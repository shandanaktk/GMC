from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "MerchantAudit API"
    app_env: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    database_url: str = "sqlite:///./merchant_audit.db"

    secret_key: str = "local-development-secret-change-before-production"
    session_cookie_name: str = "merchant_audit_session"
    session_days: int = 14
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cors_origins: str = "http://localhost:5173"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    google_register_project_on_login: bool = False
    google_developer_merchant_id: str = ""
    google_developer_email: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-6-astra"
    resend_api_key: str = ""
    resend_from_email: str = "MerchantAudit <audit@example.com>"
    resend_to_email: str = ""

    audit_max_products: int = 20_000
    website_audit_max_pages: int = 25
    request_timeout_seconds: float = 30.0

    @field_validator("frontend_url", "backend_url")
    @classmethod
    def strip_url(cls, value: str) -> str:
        return value.rstrip("/")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://") and "+" not in value.split("://", 1)[0]:
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.google_register_project_on_login and (not self.google_developer_merchant_id or not self.google_developer_email):
            raise ValueError("GOOGLE_DEVELOPER_MERCHANT_ID and GOOGLE_DEVELOPER_EMAIL are required for developer registration")
        if self.app_env == "production":
            missing = []
            if self.secret_key == "local-development-secret-change-before-production" or len(self.secret_key) < 32:
                missing.append("SECRET_KEY (at least 32 characters)")
            if not self.google_client_id:
                missing.append("GOOGLE_CLIENT_ID")
            if not self.google_client_secret:
                missing.append("GOOGLE_CLIENT_SECRET")
            if not self.google_redirect_uri:
                missing.append("GOOGLE_REDIRECT_URI")
            if self.database_url.startswith("sqlite"):
                missing.append("DATABASE_URL (PostgreSQL required in production)")
            if not self.cookie_secure:
                missing.append("COOKIE_SECURE=true")
            if missing:
                raise ValueError(f"Missing production configuration: {', '.join(missing)}")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        origins = [item.strip().rstrip("/") for item in self.cors_origins.split(",") if item.strip()]
        if self.frontend_url not in origins:
            origins.append(self.frontend_url)
        return origins

    @property
    def oauth_redirect_uri(self) -> str:
        return self.google_redirect_uri or f"{self.backend_url}{self.api_prefix}/auth/google/callback"


@lru_cache
def get_settings() -> Settings:
    return Settings()

