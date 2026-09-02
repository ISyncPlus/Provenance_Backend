import { Router } from "express";
import { asyncRoute } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { onboardingRateLimiter } from "../middleware/rateLimiter.js";
import { MeController } from "../presentation/controllers/meController.js";

export const meRouter = Router();
const controller = new MeController();

meRouter.use(requireAuth);

/** GET /api/me — Profile and onboarding status */
meRouter.get("/", asyncRoute(controller.getProfile));

/** POST /api/me/onboarding — Claim identifier and optionally elevate to reviewer */
meRouter.post("/onboarding", onboardingRateLimiter, asyncRoute(controller.onboard));

/** PATCH /api/me — Update display name */
meRouter.patch("/", asyncRoute(controller.updateName));
