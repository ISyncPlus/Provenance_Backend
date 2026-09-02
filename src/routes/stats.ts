import { Router } from "express";
import { asyncRoute } from "../middleware/errors.js";
import { requireAuth, requireOnboarded } from "../middleware/auth.js";
import { StatsController } from "../presentation/controllers/statsController.js";

export const statsRouter = Router();
const controller = new StatsController();

statsRouter.use(requireAuth, requireOnboarded);

/** GET /api/stats — Role-scoped ledger metrics */
statsRouter.get("/", asyncRoute(controller.getStats));
