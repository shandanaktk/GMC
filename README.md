# MerchantAudit frontend

Responsive React demo for the Google Merchant Center Audit MVP. It includes the marketing site, Google sign-in demo flow, audit dashboard, product and account diagnostics, report/CSV actions, specialist request flow, and persistent light/dark themes.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` for a production build and `npm run lint` for static checks.

## Backend integration

All temporary content lives in `src/mockData.js`. UI components load it through `src/services/auditService.js`; replace the service methods with the future Express API calls without changing the presentation components.
