import "dotenv/config";
import { z } from "zod";

/**
 * Environment is validated once, at boot, and never read from `process.env`
 * again. A missing secret should stop the process immediately with a readable
 * message — not surface as an undefined header three requests later.
 */

const csv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required (postgresql://user:pass@host:5432/db)"),

    /** Signs session cookies. Must be stable across restarts and >= 32 chars. */
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

    /** Public URL of THIS server — OAuth callbacks are built from it. */
    BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),

    /** Public URL of the Next.js frontend. */
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),

    /** Extra browser origins allowed to call the API, comma-separated. */
    ADDITIONAL_ORIGINS: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    /**
     * Shared secret that elevates an account to `lecturer` at onboarding.
     * Absent means lecturer elevation is disabled entirely — which is the
     * correct default, since a blank code must never authorise anyone.
     */
    LECTURER_INVITE_CODE: z.string().min(6).optional(),

    /** Optional second gate: only these emails may redeem the invite code. */
    LECTURER_EMAIL_ALLOWLIST: z.string().optional(),

    /** Cap on the stored preview, in characters of data URL. ~96px JPEG. */
    MAX_THUMBNAIL_CHARS: z.coerce.number().int().positive().default(60_000),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  })
  .superRefine((value, ctx) => {
    const pairs: Array<[string, string | undefined, string | undefined]> = [
      ["Google", value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET],
      ["GitHub", value.GITHUB_CLIENT_ID, value.GITHUB_CLIENT_SECRET],
    ];
    // Half-configured OAuth is worse than none: the button appears and then
    // dead-ends at the provider.
    for (const [name, id, secret] of pairs) {
      if (Boolean(id) !== Boolean(secret)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} OAuth is half-configured — set both ${name.toUpperCase()}_CLIENT_ID and ${name.toUpperCase()}_CLIENT_SECRET, or neither.`,
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");
  console.error(
    `\nInvalid environment configuration:\n${details}\n\nSee ENV_SETUP.md for the full walkthrough.\n`
  );
  process.exit(1);
}

const raw = parsed.data;

const isProduction = raw.NODE_ENV === "production";

export const env = {
  ...raw,
  isProduction,
  isDevelopment: raw.NODE_ENV === "development",

  /** Every origin permitted by CORS and trusted by Better Auth. */
  allowedOrigins: Array.from(
    new Set([raw.FRONTEND_URL, ...csv(raw.ADDITIONAL_ORIGINS)])
  ),

  lecturerAllowlist: csv(raw.LECTURER_EMAIL_ALLOWLIST).map((email) =>
    email.toLowerCase()
  ),

  google:
    raw.GOOGLE_CLIENT_ID && raw.GOOGLE_CLIENT_SECRET
      ? { clientId: raw.GOOGLE_CLIENT_ID, clientSecret: raw.GOOGLE_CLIENT_SECRET }
      : null,

  github:
    raw.GITHUB_CLIENT_ID && raw.GITHUB_CLIENT_SECRET
      ? { clientId: raw.GITHUB_CLIENT_ID, clientSecret: raw.GITHUB_CLIENT_SECRET }
      : null,
} as const;

export type Env = typeof env;
