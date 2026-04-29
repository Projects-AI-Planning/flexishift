# FreightFlex Frontend

## Environment

Create a `.env` file from `.env.example`.

Set:

```env
VITE_API_URL=https://your-backend-domain.com
```

Use the backend origin only. Do not append `/api/v1`; the frontend client adds that automatically.

Examples:

```env
VITE_API_URL=http://localhost:8000
VITE_API_URL=https://api.freightflex.com
```

## Vercel

This app includes `vercel.json` with:

- SPA rewrites so React Router URLs work on refresh
- basic security headers

In the Vercel project settings, add:

```env
VITE_API_URL=https://your-backend-domain.com
```
