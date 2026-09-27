# MerchantAudit

MerchantAudit is split into two independently deployable applications:

- `frontend/` — Vite + React dashboard and marketing site.
- `backend/` — FastAPI API, Google OAuth, Merchant API v1 audits, website checks, persistence, exports, email, and support chat.

## Local development

Backend:

```powershell
cd backend
Copy-Item .env.example .env
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

The frontend expects `VITE_API_URL=http://localhost:8000/api`. Configure Google OAuth before signing in; there is intentionally no sample-dashboard fallback.

## Dokploy deployment

Deploy two applications from this same repository.

### 1. Backend

1. Create a PostgreSQL service and copy its internal connection URL.
2. Create an application with **Dockerfile** build type, root/build context `backend`, and Dockerfile `backend/Dockerfile` (if Dokploy resolves the Dockerfile relative to the root, use `Dockerfile`).
3. Expose container port `8000` and attach a backend domain such as `https://api.example.com`.
4. Add the variables listed in `backend/.env.example`. Production essentials are:
   - `APP_ENV=production`
   - `DATABASE_URL=<Dokploy PostgreSQL internal URL>`
   - `SECRET_KEY=<at least 32 random characters>`
   - `FRONTEND_URL=https://your-frontend-domain`
   - `BACKEND_URL=https://your-backend-domain`
   - `CORS_ORIGINS=https://your-frontend-domain`
   - `COOKIE_SECURE=true`
   - `COOKIE_SAMESITE=none` when the two domains are on different sites; use `lax` for subdomains of the same site.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://your-backend-domain/api/auth/google/callback`
5. Set the health check to `/api/health` and deploy.

### 2. Google Cloud

1. Enable **Merchant API** in the client's Google Cloud project.
2. Configure the OAuth consent screen and request `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/content`.
3. Create an OAuth 2.0 **Web application** client.
4. Add the frontend URL under authorized JavaScript origins.
5. Add the exact backend callback URL under authorized redirect URIs.
6. Complete Google's mandatory one-time developer registration: temporarily set `GOOGLE_REGISTER_PROJECT_ON_LOGIN=true`, set `GOOGLE_DEVELOPER_MERCHANT_ID` to the platform owner's verified primary Merchant Center account, and set `GOOGLE_DEVELOPER_EMAIL`. Sign in once as a Google user who is directly added as an Admin of that primary account. Google can take up to five minutes to activate the registration; after the registration call succeeds, set the switch back to `false`, redeploy, wait five minutes, and sign in again.
7. Publish/verify the OAuth app. Google limits unverified third-party Merchant API apps, so verification is required before general client use.

### 3. Frontend

1. Change the existing Dokploy application's root/build path to `frontend`.
2. Keep the commands `npm install` and `npm run build`; keep the publish directory `dist` (relative to `frontend`).
3. Add `VITE_API_URL=https://your-backend-domain/api` as a **build-time** environment variable.
4. Redeploy. SPA rewrites remain in `frontend/public/_redirects` and `frontend/vercel.json`.

## Client credentials still required

Required for the core live audit:

- Google OAuth Web client ID and client secret from the client's Google Cloud project.
- The platform owner's verified primary Merchant Center ID plus a Google-linked developer contact email for Google's one-time developer registration. The setup user must be a directly-added Admin of that account.
- A production PostgreSQL database URL (normally supplied by Dokploy, not the client).
- A generated application `SECRET_KEY` (create internally; do not ask the client to invent one).

Required for UI features already wired but external-provider dependent:

- `RESEND_API_KEY`, a verified `RESEND_FROM_EMAIL`, and an internal `RESEND_TO_EMAIL` for client-report delivery and specialist notifications.
- `OPENAI_API_KEY` for the audit-aware support chat. `OPENAI_MODEL` is configurable.

No generic Google API key is needed. Stripe/Paddle is deliberately not integrated in this MVP.

