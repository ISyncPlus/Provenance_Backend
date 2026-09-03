# Provenance — Environment Setup

Everything needed to get the API and the web app talking to each other, in
order. Budget about 20 minutes the first time, most of it waiting on Google's
consent screen form.

There are **two** env files. They are different files in different folders:

| File | Folder | Purpose |
| --- | --- | --- |
| `.env` | `Provenance Server/` | Secrets. Never committed. |
| `.env.local` | `ImageMetadataVerificationSystem/` | Public API URL only. |

---

## 0. Prerequisites

- **Node.js 20 or newer** — check with `node -v`
- **PostgreSQL 14+**, either locally or a free hosted database

<details>
<summary>Getting a database, if you don't have one</summary>

**Option A — Neon (free, nothing to install).** Sign up at
[neon.tech](https://neon.tech), create a project, and copy the connection
string it shows. It looks like:

```
postgresql://user:password@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Option B — local Postgres.**

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16
createdb provenance
# Connection string: postgresql://<your-mac-username>@localhost:5432/provenance
```

**Option C — Docker.**

```bash
docker run --name provenance-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=provenance -p 5432:5432 -d postgres:16
# Connection string: postgresql://postgres:postgres@localhost:5432/provenance
```

</details>

---

## 1. Create the server `.env`

```bash
cd "Provenance Server"
cp .env.example .env
```

Open `.env` and work down it.

### `DATABASE_URL`

Paste the connection string from step 0.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/provenance"
```

### `BETTER_AUTH_SECRET`

This signs session cookies. It must be at least 32 characters, and it must stay
the same between restarts — changing it signs everyone out.

```bash
openssl rand -base64 32
```

Paste the output:

```env
BETTER_AUTH_SECRET="Xk9mP2vQ8sL4nR7tY1wZ3bC6dF0gH5jK8lM2nP4qR6s="
```

### URLs

For local development the defaults are already correct:

```env
BETTER_AUTH_URL="http://localhost:4000"   # this API
FRONTEND_URL="http://localhost:3000"      # the Next.js app
```

> These two are how CORS and the OAuth callbacks are built. If you change a
> port, change it here too or sign-in will fail with a CORS error.

### `LECTURER_INVITE_CODE`

Everyone who signs up is a **student**. This code is what upgrades an account to
**lecturer** during onboarding — it is checked on the server and never sent to
the browser.

```env
LECTURER_INVITE_CODE="physci-reviewer-2026"
```

Pick anything at least 6 characters and give it only to staff. Leaving it blank
disables reviewer access entirely.

Optionally restrict who may redeem it:

```env
LECTURER_EMAIL_ALLOWLIST="hod@unizik.edu.ng,supervisor@unizik.edu.ng"
```

---

## 2. OAuth credentials

Both providers are **optional**. Email + password sign-in works without either.

> Set both the ID and the secret for a provider, or neither. A half-configured
> provider fails at boot on purpose — otherwise the button appears and
> dead-ends at the provider.

### Google

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Create a project (top-left dropdown → **New Project**), name it `Provenance`.
3. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - App name `Provenance`, and your email in both email fields
   - Save and continue through *Scopes* (no changes needed)
   - On *Test users*, add every Google account you'll sign in with while the
     app is unpublished — **including your own**. This is the step people miss;
     without it Google returns `access_blocked`.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Provenance Local`
   - **Authorised JavaScript origins:** `http://localhost:3000`
   - **Authorised redirect URIs:**
     ```
     http://localhost:4000/api/auth/callback/google
     ```
     Note the port is **4000** (the API), not 3000. The callback is handled by
     the server, not the browser app.
5. Copy the client ID and secret into `.env`:

```env
GOOGLE_CLIENT_ID="1234567890-abc123.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
```

### GitHub

1. [github.com/settings/developers](https://github.com/settings/developers) →
   **OAuth Apps** → **New OAuth App**
2. Fill in:
   - Application name: `Provenance`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL:
     ```
     http://localhost:4000/api/auth/callback/github
     ```
3. **Register application**, then **Generate a new client secret**. Copy it
   immediately — GitHub shows it once.

```env
GITHUB_CLIENT_ID="Ov23liXXXXXXXXXXXX"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 3. Create the frontend `.env.local`

```bash
cd ../ImageMetadataVerificationSystem
cp .env.local.example .env.local
```

The default is correct for local development:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

If you skipped a provider, hide its button:

```env
NEXT_PUBLIC_ENABLE_GITHUB="false"
```

> Only `NEXT_PUBLIC_*` variables exist here. Anything with that prefix is
> compiled into JavaScript the browser downloads — never put a secret in this
> file.

---

## 4. Install and create the tables

```bash
# API
cd "Provenance Server"
npm install
npx prisma migrate dev --name init    # creates the tables
```

`prisma migrate dev` downloads a query engine on first run, so it needs
internet. If it succeeds you'll see `Your database is now in sync`.

```bash
# Web app
cd ../ImageMetadataVerificationSystem
npm install
```

---

## 5. Run both

Two terminals, both left running:

```bash
# Terminal 1 — API
cd "Provenance Server"
npm run dev
```

```bash
# Terminal 2 — web app
cd ImageMetadataVerificationSystem
npm run dev
```

The API prints a summary on boot:

```
  Provenance API
  ──────────────────────────────────────────
  listening   http://localhost:4000
  env         development
  frontend    http://localhost:3000
  auth        Google, GitHub, email/password
  reviewer    invite code enabled
```

Open **http://localhost:3000**.

---

## 6. Verify it works

1. Click **Sign in** → create an account or use Google/GitHub.
2. You land on **onboarding**. Enter a registration number, e.g. `2021/248001`,
   and continue. You are now a **student**.
3. Drop an original camera photo (one straight off a phone, not a screenshot or
   a WhatsApp download) onto the panel. You should get a verdict and see the
   record appear in your list.
4. Sign out. Create a **second** account, and on onboarding tick *I am a
   departmental reviewer* and enter your `LECTURER_INVITE_CODE`.
5. You land on the lecturer ledger and can see the student's submission.
6. Sign back in as the student and submit **the same photo again** — it should
   come back **Reused**. That is the server's global duplicate check, and it is
   the thing the old browser-only version could never do.

---

## Troubleshooting

**`Invalid environment configuration` on boot**
The message names the offending variable. Most often `BETTER_AUTH_SECRET` is
under 32 characters, or one half of an OAuth pair is filled in.

**`Origin http://localhost:3000 is not allowed by CORS`**
`FRONTEND_URL` doesn't match where the app is actually served. If Next.js chose
port 3001 because 3000 was busy, either free 3000 or update `FRONTEND_URL`.

**Signed in, but the app says signed out**
The session cookie isn't reaching the API. Check `NEXT_PUBLIC_API_URL` matches
`BETTER_AUTH_URL` exactly — `localhost` and `127.0.0.1` are different origins to
a browser, so mixing them silently breaks the cookie. In production, on
separate domains, this can also happen only in some browsers — see "OAuth
reliability" under Going to production.

**Google: `Error 403: access_blocked`**
Your account isn't on the OAuth consent screen's *Test users* list. Add it.

**Google or GitHub: `redirect_uri_mismatch`**
The callback URL registered with the provider must be exactly
`http://localhost:4000/api/auth/callback/<provider>` — port 4000, no trailing
slash.

**`prisma migrate` fails to download an engine**
It needs access to `binaries.prisma.sh`. On a restricted network, run it from
one that isn't.

**The invite code is refused**
It's compared exactly — check for a trailing space in `.env`, and restart the
API after editing (env is read once, at boot).

---

## Going to production

1. `NODE_ENV=production`. Cookies become `Secure` and `SameSite=None`, so both
   apps **must** be served over HTTPS.
2. Point `BETTER_AUTH_URL` and `FRONTEND_URL` at the real domains.
3. Add the production callback URLs to Google and GitHub — the localhost ones
   keep working, so add rather than replace.
4. Generate a **fresh** `BETTER_AUTH_SECRET`; never reuse the development one.
5. Use `npx prisma migrate deploy` on the server, not `migrate dev`.
6. Rotate `LECTURER_INVITE_CODE` and set `LECTURER_EMAIL_ALLOWLIST`.
7. Never commit `.env`. It is already git-ignored — keep it that way.
8. **List every domain the frontend is actually served from** in
   `FRONTEND_URL` / `ADDITIONAL_ORIGINS` — the production custom domain *and*
   the default `*.vercel.app` one if people ever land on it (a Vercel deploy
   notification links the auto-generated domain, not your custom one). A
   domain missing from this list doesn't error loudly; sign-in on it just
   fails, which reads as "OAuth is flaky" when it is really "this particular
   origin was never allow-listed."

### OAuth reliability (sign-in "sometimes works, sometimes doesn't")

If the frontend (Vercel) and the API (Render/Railway/Fly/…) are on
**completely separate domains** — not two subdomains of the same site — the
session cookie the API sets is, from the browser's point of view, a
**third-party cookie**. `sameSite: "none", secure: true` (set automatically
in production, see `src/auth.ts`) is *necessary* for that but not always
*sufficient*: Safari's Intelligent Tracking Prevention blocks third-party
cookies by default regardless of `SameSite`, and Chrome/Firefox are moving
the same direction. The result is exactly this symptom — it works in one
browser or one session and not another, with no code change in between.

**The fix that actually removes the flakiness** is to make the cookie
first-party by putting the API under the *same site* as the frontend:

- **Preferred — a subdomain.** Serve the frontend at `app.yourdomain.com` (or
  the bare domain) and the API at `api.yourdomain.com`. Cookies set by
  `api.yourdomain.com` are then first-party to a visitor on
  `app.yourdomain.com` — no ITP/third-party blocking applies. Update
  `BETTER_AUTH_URL`, `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to the new
  domains and re-register the OAuth callback URLs with Google/GitHub.
- **No custom domain — proxy through Vercel (what this deployment uses).**
  `ImageMetadataVerificationSystem/next.config.ts` already has a `rewrites()`
  that forwards every `/api/*` request to the real API server-side. Two env
  vars make it active:

  | Where | Variable | Value |
  | --- | --- | --- |
  | Vercel project settings (Production **and** Preview) | `API_ORIGIN` | `https://provenance-backend-mamk.onrender.com` |
  | Vercel project settings (Production **and** Preview) | `NEXT_PUBLIC_API_URL` | `""` (empty — not unset, empty) |

  With `NEXT_PUBLIC_API_URL` empty, `lib/auth-client.ts` calls this app's own
  `/api/*` paths instead of the Render domain directly; Vercel's rewrite
  forwards those server-side. The browser now only ever talks to one origin
  (`provenance-imvs.vercel.app`), so the session cookie is first-party by
  construction — no browser's third-party-cookie policy can touch it.
  `API_ORIGIN` has no `NEXT_PUBLIC_` prefix on purpose: it's read by the
  rewrite at request time on Vercel's infrastructure, never shipped to the
  browser.

  Redeploy after setting both — Next.js reads `rewrites()` and inlines
  `NEXT_PUBLIC_*` values at build time, so they won't take effect until the
  next deploy.

  **This alone is not the whole fix.** It routes ordinary API calls
  (`/api/me`, `/api/submissions`, `get-session`, …) through Vercel, but the
  OAuth handshake itself — `/api/auth/sign-in/social`,
  `/api/auth/callback/google` — needs to go through Vercel too, or the
  session cookie Google's redirect causes to be set still lands on the
  Render domain, and every *proxied* call afterwards (which the browser now
  addresses to Vercel) won't carry it. Three more changes, together:

  1. On the API host (Render), set `BETTER_AUTH_URL` to the **frontend's**
     URL — `https://provenance-imvs.vercel.app` — instead of the API's own
     `onrender.com` URL. This only changes what URL Better Auth *writes into
     the links it generates*; Express still listens wherever Render put it,
     the Vercel rewrite is what makes the public URL and the actual server
     match up again.
  2. In the Google Cloud Console and the GitHub OAuth App, add
     `https://provenance-imvs.vercel.app/api/auth/callback/google` and
     `.../api/auth/callback/github` as authorized redirect URIs — Google and
     GitHub redirect the browser to whatever `redirect_uri` Better Auth now
     builds from the new `BETTER_AUTH_URL`, so they have to be told that URI
     is expected. Leave the old `onrender.com` ones registered too so
     nothing mid-flight breaks the moment you deploy.
  3. `FRONTEND_URL` / `ADDITIONAL_ORIGINS` on the API can stay as they are —
     they already need to list the Vercel domain for CORS, which this reuses.

  Do the `BETTER_AUTH_URL` change and the console redirect URIs together —
  half of this (only the rewrite, or only the Google Console change) leaves
  sign-in either unreachable or landing on the wrong domain.

Either approach means `account.skipStateCookieCheck` in `src/auth.ts` is no
longer covering for a real gap — it can stay on as a harmless fallback, but
the browser-dependent sign-in failures it was worked around for should stop
happening once the domains are same-site.
