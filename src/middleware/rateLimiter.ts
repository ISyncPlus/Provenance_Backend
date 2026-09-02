import rateLimit from "express-rate-limit";
import { env } from "../env.js";

/** General API rate limiter for standard queries. */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "rate_limited",
      message: "Too many requests. Please slow down and try again shortly.",
    },
  },
});

/** Stricter rate limiter on submission creation to prevent hash-probing or ledger flooding. */
export const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "submission_rate_limited",
      message: "Too many verification submissions. Please wait a minute before filing more records.",
    },
  },
});

/** Strict rate limiter on onboarding to protect lecturer invite code from brute-force attempts. */
export const onboardingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: {
      code: "onboarding_rate_limited",
      message: "Too many onboarding attempts. Please try again later.",
    },
  },
});
