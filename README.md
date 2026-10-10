# TedJournal

 Sign in with Google, upload a screenshot of each trade then review your performance on a dashboard and calendar.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, SSR) on Vite
- Tailwind CSS v4 + shadcn/ui (Radix)
- Supabase (Auth with Google, Postgres with RLS, Storage for screenshots)
- TanStack Query, Recharts, Zod, Drizzle (schema/migrations only)
- Nitro for the production server build

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing + "Continue with Google" sign-in |
| `/journal` | Main page: upload a screenshot and log a trade |
| `/log` | Gallery/list of logged trades and screenshots |
| `/dashboard` | Weekly / monthly / yearly / all-time stats: win rate, win rate by pair, result pie, net pips |
| `/calendar` | Per-day trade count, win rate, net pips |
| `/rules` | Personal numbered trading rules (private per account) |

## Repo structure

Main files are marked with ⭐.

```
.
├── src/
│   ├── routes/
│   │   ├── __root.tsx              ⭐ HTML shell, favicon, fonts, error/404 pages
│   │   ├── index.tsx               ⭐ Sign-in page (Google OAuth via Supabase)
│   │   └── _authenticated/
│   │       ├── route.tsx           ⭐ Auth guard + app layout/nav for all pages below
│   │       ├── journal.tsx         ⭐ Log a trade (screenshot upload + form)
│   │       ├── log.tsx                Trade log
│   │       ├── dashboard.tsx       ⭐ Stats and charts
│   │       ├── calendar.tsx           Calendar view
│   │       └── rules.tsx              Personal trading rules
│   ├── lib/
│   │   ├── trades.ts               ⭐ Trade types, pair list, Supabase queries/mutations
│   │   ├── rules.ts                   Trading rules queries
│   │   ├── utils.ts                   Helpers (cn)
│   │   ├── error-reporting.ts         Client error logging
│   │   └── error-capture.ts / error-page.ts   SSR error handling
│   ├── integrations/supabase/
│   │   ├── client.ts               ⭐ Browser Supabase client (reads VITE_SUPABASE_*)
│   │   ├── client.server.ts           Server-side Supabase client
│   │   ├── auth-middleware.ts / auth-attacher.ts   Attach user session to server calls
│   │   └── types.ts                   Generated DB types
│   ├── components/
│   │   ├── ui/                        shadcn/ui components
│   │   └── NicknameDialog.tsx         Asks for a display name after first login
│   ├── styles.css                  ⭐ Tailwind theme and color variables
│   ├── router.tsx / start.ts          Router and TanStack Start setup
│   ├── server.ts                      SSR entry with error wrapper
│   └── routeTree.gen.ts               Auto-generated, do not edit
├── drizzle/
│   ├── schema.ts                   ⭐ Database schema
│   └── migrations/                 ⭐ SQL migrations 0000–0003 (tables, storage policies, RLS)
├── setup-all.sql                   ⭐ All migrations combined — paste into Supabase SQL editor
├── public/                            Static files (tedicon.ico favicon, robots.txt)
├── vite.config.ts                  ⭐ Vite + TanStack Start + Tailwind + Nitro
├── .env.example                    ⭐ Required environment variables
└── package.json                       Scripts and dependencies
```

## Getting started

### 1. Install

```sh
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env` and fill in the project URL and publishable key (Project Settings → API).
3. In the **SQL Editor**, paste and run [setup-all.sql](setup-all.sql). This creates the tables, the `trade-screenshots` storage policies and row-level security.

### 3. Set up Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com) create an **OAuth client ID** (type *Web application*).
2. Add this authorized redirect URI: `https://YOUR-REF.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Sign In / Providers → **Google**, enable it and paste the client ID and secret.
4. In Supabase → Authentication → URL Configuration, set the Site URL and add your redirect URLs (`http://localhost:8080` for local dev, plus your production URL).

The Google client ID/secret live only in Supabase, never in this repo.

### 4. Run

```sh
npm run dev      # http://localhost:8080
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build into `.output/` |
| `node .output/server/index.mjs` | Run the production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Deployment

`npm run build` uses Nitro, which defaults to a Node server. Set `NITRO_PRESET` (for example `vercel`, `netlify`, `cloudflare_pages`) to target another host. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the `VITE_` equivalents in the host's environment, and add the production URL to Supabase's redirect URLs.
