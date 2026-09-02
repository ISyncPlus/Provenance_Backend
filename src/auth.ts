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
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
});

export type Auth = typeof auth;
