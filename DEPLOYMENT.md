# MissionOS — Deployment Guide

MissionOS is two deployables:

1. **Frontend** — a static Vite SPA. Deploys cleanly to **Vercel** (already is).
2. **API** — an Express server that hydrates an in-memory cache from Postgres at
   boot and serves it with a write-through to Neon.

> **Architecture note (important).** The API is built for a **long-lived
> process**, not serverless cold-starts: it loads the dataset into memory once at
> startup. On Vercel's serverless functions every cold start would reload from
> Neon (slow) and the in-memory write-through doesn't fit the per-invocation
> model. **Recommended:** host the API on a **persistent Node host** (Railway,
> Render, Fly.io, or any VM/container) and point the Vercel frontend at it. A
> Dockerfile is provided (`Dockerfile.api`).

---

## 1. Frontend on Vercel

The repo includes `vercel.json` (build command, SPA rewrites, and security
headers — HSTS, CSP, X-Frame-Options, nosniff, referrer policy).

**Build env var (set in Vercel → Project → Settings → Environment Variables):**

| Name | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://<your-api-host>/api` | Vite inlines this at build time; the SPA calls it. If unset, the app falls back to bundled demo data. |

Then redeploy. That's it for the frontend.

## 2. API on a persistent host (recommended)

Set these environment variables on the API host (a managed secret store is best):

| Name | Required | Example / notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** URL with `sslmode=require` (TLS is verified). |
| `JWT_SECRET` | yes | 32+ char random secret. `openssl rand -hex 48` |
| `JWT_REFRESH_SECRET` | yes | distinct 32+ char random secret |
| `CORS_ORIGIN` | yes | `https://mission-os-ecru.vercel.app` (your frontend origin) |
| `PORT` | no | defaults to 4100 |
| `MFA_REQUIRED_FOR_ADMIN` | no | `true` to require admins to enrol MFA |
| `MFA_PROTECT_EMAILS` | no | comma list of accounts blocked from MFA (default: the demo admin) |
| `PG_SSL_NO_VERIFY` | no | leave unset — TLS certs are verified by default |

The app fails closed if `JWT_SECRET`/`JWT_REFRESH_SECRET` are missing or weak.

**Build & run (Docker):**

```bash
docker build -f Dockerfile.api -t missionos-api .
docker run -p 4100:4100 --env-file .env missionos-api
# one-time (or whenever you want a clean dataset):
#   npm run db:seed   # seeds the records table on Neon if empty / resets it
```

Railway/Render: point them at this repo, build command `npm run build:api`,
start command `node server/dist/index.js`, and set the env vars above.

## 3. Vercel-only (if you must run the API on Vercel)

Possible but not recommended as-is: wrap the Express app in a Vercel Node
function and accept per-cold-start hydration, **or** refactor the repository to
query Postgres per request (drop the in-memory cache). Ask and I can do the
serverless refactor — it's a real change to the data layer.

---

## What I need to push this for you
I don't have access to your Vercel account from here. To have me deploy:
- a **Vercel token** (Project/Team scope) — then I can set env vars + deploy the
  frontend; and/or
- your **chosen API host** (Railway/Render/Fly) credentials or a confirmation to
  generate the project config for it.

**Never paste long-lived production secrets into chat** — prefer a short-lived,
scoped token you revoke afterward, or add them yourself in the provider dashboard
and just tell me when they're set.

> Security reminder: the Neon password shared earlier should be **rotated**, since
> secrets shared in chat/logs must be treated as compromised.
