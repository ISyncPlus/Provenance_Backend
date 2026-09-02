# Provenance API 🛡️

Express + Prisma + Better Auth backend for **Provenance**, the image metadata
verification system for academic submissions.

Designed and developed by **Ebube Ezedimbu**.

Setup — including database and OAuth credentials — is in **[ENV_SETUP.md](./ENV_SETUP.md)**.
The reasoning behind the architecture, and the objections it survived, is in
`ARCHITECTURE.md` in the web app folder.

---

## What this server is for

Image analysis happens in the browser. This server exists to do the things a
browser cannot:

1. **Own the verdict.** The client sends the metadata it extracted; it does not
   send a result. The server re-applies the verification rules and derives the
   status itself, so a student cannot `curl` their way to *Verified*.
2. **Detect duplicates globally.** Hashes are compared across every student, not
   just against one browser's own history — which is the check that actually
   catches recycled coursework.
3. **Maintain an immutable audit trail.** Administrative actions (onboarding,
   reviewer elevations, and record deletions) are logged to an append-only audit
   table for academic compliance.

The original photograph is never uploaded. What is stored is the SHA-256 digest,
the extracted metadata, the verdict, and a ≤96px thumbnail so reviewers can see
what was submitted.

---

## Architecture Overview

The backend is built as a **High-Resilience Modular Monolith** structured in clean, decoupled layers:

```
src/
├── domain/                  # Pure business rules & value objects (Coordinates, FileHash, VerificationEngine)
├── application/             # Use cases (SubmitVerification, ListSubmissions, OnboardUser, GetStats, etc.)
├── infrastructure/          # Database repositories (Prisma with PostgreSQL transaction advisory locks)
├── presentation/            # Express controllers, response serializers, and health probes
└── middleware/              # Auth, Request Tracing (X-Request-ID), Tiered Rate Limiting, Error Handlers
```

### Concurrency & Race-Condition Safety
To prevent race conditions during simultaneous duplicate uploads, `SubmitVerificationUseCase` acquires a PostgreSQL transaction-level advisory lock (`pg_advisory_xact_lock(hashtext(hash))`), guaranteeing that parallel requests for identical files serialize cleanly.

---

## Commands

```bash
npm run dev              # watch mode on :4000
npm run build            # prisma generate + tsc
npm start                # run the compiled server
npm run typecheck        # types only

npm run prisma:migrate   # create/apply a migration (development)
npm run prisma:deploy    # apply migrations (production)
npm run prisma:studio    # browse the data in web GUI
```

---

## API Endpoints

All routes (except auth and health probes) require a session cookie. Role checks are enforced by middleware, not by the UI.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `ALL` | `/api/auth/*` | anyone | Better Auth (sign-in, OAuth, sign-out) |
| `GET` | `/api/me` | signed in | Current profile & onboarding status |
| `POST` | `/api/me/onboarding` | signed in | Claim identifier; redeem reviewer code |
| `PATCH` | `/api/me` | signed in | Update display name |
| `GET` | `/api/submissions` | onboarded | Own records; lecturers see all with search |
| `POST` | `/api/submissions` | onboarded | File a record and receive the authoritative verdict |
| `GET` | `/api/submissions/:id` | owner or lecturer | One record |
| `DELETE` | `/api/submissions/:id` | lecturer | Remove a record (logged to audit ledger) |
| `GET` | `/api/stats` | onboarded | Counts, scoped by role |
| `GET` | `/health` | anyone | Fast liveness probe |
| `GET` | `/health/live` | anyone | Liveness check |
| `GET` | `/health/ready` | anyone | Deep readiness probe (checks DB connection & query latency) |

### Roles

Sign-up always produces a **student**. Elevation to **lecturer** happens only at
onboarding, by presenting `LECTURER_INVITE_CODE`, which is verified server-side
and optionally constrained by `LECTURER_EMAIL_ALLOWLIST`. There is no request
body anywhere that accepts a role.

---

## Security & Observability

- **Auth Mounting**: Auth routes mount **before** `express.json()` — Better Auth reads the raw stream, and a body parser ahead of it breaks OAuth callbacks.
- **CORS Allowlist**: Explicit origin allowlist with credentials enabled; wildcards cannot carry cookies.
- **Request Tracing**: Every request is tagged with an `X-Request-ID` correlation header for end-to-end tracing.
- **Tiered Rate Limiting**: Granular rate limiters for general API routes, submission creation (30/min), and onboarding (15/min).
- **Error Shielding**: Prisma errors are translated to HTTP status codes; internal error details are withheld from clients in production.

---

## Known Limitation

The server validates the verification *rules* and duplicate status, but it does
not re-extract EXIF — it has no file to extract from. A determined client could
therefore submit fabricated metadata values. Closing this would require
uploading the original image, which the privacy design rules out. This is
documented deliberately rather than papered over.

---

## Author & Credits

Designed and engineered by **Ebube Ezedimbu**.

## License

This project is licensed under the [MIT License](./LICENSE).
