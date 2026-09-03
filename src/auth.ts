import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { env } from "./env.js";

/**
 * Better Auth owns identity: email/password plus Google and GitHub OAuth.
 *
 * Note what is *not* here: any way for a client to choose its own role. Role is
 * pinned to `student` on creation and can only be changed by the onboarding
 * route after it has verified the invite code server-side (Decision 3).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  /** Browser origins allowed to start a flow and receive the session cookie. */
  trustedOrigins: env.allowedOrigins,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No mail transport is wired up for the case study, so requiring
    // verification would lock every account out at the door.
    requireEmailVerification: false,
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
    // `signIn.social()` kicks the flow off with a cross-site `fetch()` from the
    // Vercel frontend to this API, not a top-level navigation — so the state
    // cookie this sets is a third-party cookie from the browser's point of
    // view. Safari's Intelligent Tracking Prevention (and Chrome/Firefox's
    // increasingly strict third-party-cookie policies) can drop it before the
    // provider redirects back, which surfaces as "State mismatch: State not
    // persisted correctly" — intermittently, depending on the visitor's
    // browser and its privacy settings, not on anything this server does.
    // Skipping the check falls back to the state row in `verification`
    // (looked up by the random `state` param, single-use, expiring), which
    // does not depend on that cookie surviving the round trip.
    //
    // This treats the symptom, not the cause. The real fix is to make the
    // session cookie first-party by putting the API on a subdomain of the
    // same site as the frontend (or proxying /api/* through the frontend's
    // domain) so no cookie in this flow is ever cross-site. See "OAuth
    // reliability" in ENV_SETUP.md.
    skipStateCookieCheck: true,
  },

  socialProviders: {
    ...(env.google
      ? {
          google: {
            clientId: env.google.clientId,
            clientSecret: env.google.clientSecret,
          },
        }
      : {}),
    ...(env.github
      ? {
          github: {
            clientId: env.github.clientId,
            clientSecret: env.github.clientSecret,
          },
        }
      : {}),
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        // The decisive line: role is never read from the request payload.
        input: false,
      },
      identifier: {
        type: "string",
        required: false,
        input: false,
      },
      onboardedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once a day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      // The frontend and API are separate origins in development, so the
      // cookie has to survive a cross-site request. `None` demands `Secure`,
      // which localhost cannot provide — hence Lax + credentials in dev.
      sameSite: env.isProduction ? "none" : "lax",
      secure: env.isProduction,
    },
    // Namespaces this app's cookies (avoids collisions with other apps on the
    // same domain). Does NOT change how OAuth state is stored — that's
    // `account.skipStateCookieCheck` above, and it's a workaround, not a fix.
    // See "OAuth reliability" in ENV_SETUP.md for what actually fixes it.
    cookiePrefix: "provenance",
  },

  verification: {
    // This DB row (looked up by the single-use `state` param) is what OAuth
    // sign-in actually relies on when the state cookie doesn't survive the
    // cross-site redirect — see `account.skipStateCookieCheck` above.
    storeInDatabase: true,
    // Disable hashed identifiers so BETTER_AUTH_SECRET rotation doesn't break
    // in-flight OAuth flows.
    storeIdentifier: "plain",
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
});

export type Auth = typeof auth;
