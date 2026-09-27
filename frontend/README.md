# MerchantAudit frontend

React/Vite client for the live MerchantAudit API. Dashboard data, OAuth sessions, audits, exports, specialist requests, report email, and support chat all use `src/services/auditService.js`; there is no mock dashboard fallback.

## Local run

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to the FastAPI `/api` base URL. Use `npm run build` for a production build and `npm run lint` for static checks.

For Dokploy, set this folder as the application root, expose `VITE_API_URL` at build time, and publish `dist`.

