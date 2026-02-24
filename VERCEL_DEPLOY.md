# Vercel Deployment Guide

The FastAPI/Rust backend must continue to run on a traditional host (Render, Railway, Fly, etc.). Vercel serves the Vite frontend and forwards requests to the backend URL you supply via `VITE_API_URL`.

## 1. Prerequisites

- Working backend endpoint, e.g. `https://pricing-engine-api.onrender.com`
- GitHub repository with this project pushed
- Vercel account with access to the repo

## 2. Configure Environment Variables

Create a secret (or regular environment variable) for the backend base URL:

```bash
vercel secrets add vite_api_url https://pricing-engine-api.onrender.com
```

The root `vercel.json` maps that secret to the `VITE_API_URL` variable that Vite reads at build time. You can also set the variable from the Vercel dashboard (Project Settings → Environment Variables) if you prefer a UI.

## 3. Deploy the Frontend

1. In Vercel, click **New Project** → choose this repo.
2. Leave the root directory as the repo root (the provided `vercel.json` handles the monorepo layout).
3. Deployment configuration picked from `vercel.json`:
   - Install command: `cd frontend && npm install`
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/dist`
4. Add the `VITE_API_URL` environment variable (Production & Preview) with the backend URL. If you used the secret above, it is already wired via `vercel.json`.
5. Deploy.

## 4. Verify

After Vercel finishes:

```bash
curl https://<your-vercel-app>/health   # served from FastAPI backend
```

Use DevTools → Network to confirm POST requests (e.g., `/price/call/bs`) hit the backend domain defined in `VITE_API_URL`.

## 5. Local Parity

When testing locally, copy `.env.production.example` to `.env.local` in `frontend/` and set `VITE_API_URL=http://localhost:8000`. Vite automatically injects the variable.

---

If you later host the backend somewhere else, simply update the `vite_api_url` secret or the Vercel env var and trigger a redeploy—no code changes required.
