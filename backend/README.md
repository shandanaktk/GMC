# MerchantAudit backend

FastAPI backend for Google OAuth, Merchant API v1 audits, live website checks, secure sessions, PDF/CSV reports, specialist requests, Resend delivery, and audit-aware OpenAI support.

## Local run

1. Copy `.env.example` to `.env` and fill the Google OAuth values.
2. Install dependencies: `python -m pip install -r requirements.txt`.
3. Start: `uvicorn app.main:app --reload`.

Google now requires one-time Merchant API developer registration. For the setup login only, set `GOOGLE_REGISTER_PROJECT_ON_LOGIN=true`, provide the platform owner's verified primary `GOOGLE_DEVELOPER_MERCHANT_ID` and contact `GOOGLE_DEVELOPER_EMAIL`, and sign in as a directly-added Admin of that account. After registration succeeds, immediately turn the switch back off and redeploy. Google can take up to five minutes to activate the project link before normal API calls succeed.

SQLite is the local default. Use a PostgreSQL `DATABASE_URL` in Dokploy. Database tables are created idempotently at startup.

## Security model

- OAuth refresh/access tokens are encrypted at rest using a key derived from `SECRET_KEY`.
- The browser receives only a random, opaque HttpOnly session cookie; its SHA-256 hash is stored in the database.
- Google Merchant access uses the required `https://www.googleapis.com/auth/content` scope. The application only calls read endpoints.
- Website crawling rejects private, loopback, reserved, and link-local targets.
- Cross-origin credentials require an exact `CORS_ORIGINS` value and production cookies should use `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` when the frontend and backend are on different sites.

