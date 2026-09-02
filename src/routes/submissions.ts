import { Router } from "express";
import { asyncRoute } from "../middleware/errors.js";
import { requireAuth, requireOnboarded } from "../middleware/auth.js";
import { submissionRateLimiter } from "../middleware/rateLimiter.js";
import { SubmissionsController } from "../presentation/controllers/submissionsController.js";

export const submissionsRouter = Router();
const controller = new SubmissionsController();

submissionsRouter.use(requireAuth, requireOnboarded);

/** GET /api/submissions — Scoped list with cursor pagination and search */
submissionsRouter.get("/", asyncRoute(controller.list));

/** POST /api/submissions — Concurrency-safe submission verification with advisory locking */
submissionsRouter.post("/", submissionRateLimiter, asyncRoute(controller.create));

/** GET /api/submissions/:id — Owner or any lecturer */
submissionsRouter.get("/:id", asyncRoute(controller.getById));

/** DELETE /api/submissions/:id — Lecturers only */
submissionsRouter.delete("/:id", asyncRoute(controller.delete));
