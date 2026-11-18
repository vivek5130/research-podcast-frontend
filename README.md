# DailyCast Frontend (Next.js)

Next.js 15 (App Router) + Tailwind CSS v4 + SWR. Users sign in with Google, create daily podcast schedules, trigger runs, and listen to episodes.

## How it talks to the backend

```
Browser ──▶ Next.js (this app) ──/api/* rewrite──▶ FastAPI backend
```
- [`next.config.ts`](next.config.ts) **proxies `/api/*`** to `BACKEND_URL`, so the browser only ever sees one origin.
- The session is an **httpOnly cookie** set by the backend. JavaScript never touches the token. It stays first-party (SameSite=Lax), so there are no CORS or third-party-cookie problems.
- [`src/middleware.ts`](src/middleware.ts) sends signed-out visitors on `/dashboard`, `/schedulers/*` and `/runs/*` to `/?next=<path>`, so the email link still lands on the right episode after sign-in. The backend still validates the cookie on every call.

## Pages

| Route | What it shows |
|---|---|
| `/` | Landing + sign-in (Google button; email dev sign-in when `NEXT_PUBLIC_ALLOW_DEV_LOGIN=true`) |
| `/dashboard` | Schedules (run now, pause/resume), create form, recent episodes (polls while generating) |
| `/schedulers/[id]` | Edit topic/time/timezone, run now, pause, delete, episode history |
| `/runs/[id]` | Live progress (queued → research → audio → ready), audio player, sources, script. The email links here. |

## Code map

```
src/
  middleware.ts             route guard (cookie present?)
  lib/api.ts                typed API client (same-origin fetch, ApiError)
  lib/types.ts              types mirroring backend schemas
  lib/format.ts             time/duration/status formatting, timezones
  components/
    SessionProvider.tsx     loads the user once; clears an invalid session
    AppHeader.tsx           brand, user, sign out
    GoogleSignInButton.tsx  Google Identity Services button → ID token
    SignInPanel.tsx         sign-in card (Google + dev), safe ?next= redirect
    SchedulerForm.tsx       create/edit form
    SchedulerCard.tsx       schedule summary + actions
    RunList.tsx             episode list
    ui.tsx                  Button, Card, Input, Select, Field, badges...
  app/
    page.tsx                landing + sign-in
    (app)/layout.tsx        signed-in shell
    (app)/dashboard, (app)/schedulers/[id], (app)/runs/[id]
```

## Run locally

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_GOOGLE_CLIENT_ID; NEXT_PUBLIC_ALLOW_DEV_LOGIN=true for local testing
npm install
npm run dev                  # http://localhost:3000 (backend must run on BACKEND_URL, default :3001)
```
The backend must have `SESSION_COOKIE_SECURE=false` locally (http), and `ALLOW_DEV_LOGIN=true` if you use dev sign-in.

**Google sign-in:** in Google Cloud Console, open your OAuth client and add `http://localhost:3000` and your Vercel URL under **Authorized JavaScript origins**.

## Performance: dev vs production

`npm run dev` compiles each page on first visit (1–7 s) and ships about 9 MB of unminified JS, so it *feels* slow. Production is what users get:

| Page | `next dev` first / repeat | Production |
|---|---|---|
| /dashboard | 7.6 s / 0.95 s | **0.02 s** |
| /runs/[id] | 3.3 s / 0.18 s | **0.03 s** |
| JS for /dashboard | 9.3 MB | **517 KB** (~120 KB gzipped) |

To feel production speed locally:
```bash
npm run build && npm start        # http://localhost:3000
```
Episode links preload their data on hover (SWR `preload`), so the episode page is usually ready by the time you click.

### Loading states (navigate first, load data after)

- **Instant feedback:** a thin green progress bar (`NavigationProgress`) starts on click, and the clicked sidebar link shows a spinner (`useLinkStatus`).
- **Route skeletons:** every route has a `loading.tsx` with a page-shaped skeleton (`components/skeletons.tsx`). Next prefetches it, so it shows immediately.
- **Lazy data:** pages render right away and show section skeletons until SWR returns. Cached data shows instantly and revalidates in the background.

Measured on a production build: an uncached episode page appears with its skeleton in about 36 ms, and the data fills in at about 0.6 s. Cached pages switch in about 60 ms. In `next dev` the first visit to a route still waits for compilation.

## Deploy to Vercel

1. New Project → same repo → **Root Directory `frontend`** (Next.js is detected automatically).
2. Env vars:
   - `BACKEND_URL=https://<backend>.vercel.app`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...`
   - `NEXT_PUBLIC_ALLOW_DEV_LOGIN=false`
3. On the backend, set `FRONTEND_URL=https://<frontend>.vercel.app`. The email links use it.
