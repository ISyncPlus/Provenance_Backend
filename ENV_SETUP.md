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
a browser, so mixing them silently breaks the cookie.

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
