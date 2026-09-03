import type { Request, Response } from "express";
import { GetStatsUseCase } from "../../application/use-cases/getStats.js";

export class StatsController {
  constructor(
    private readonly getStatsUseCase: GetStatsUseCase = new GetStatsUseCase()
  ) {}

  getStats = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.getStatsUseCase.execute(req.user!);
    // Enveloped as `{ stats }`, like every other endpoint here returns
    // `{ user }` / `{ submission }`. This one used to return the counts bare,
    // so the client's `data.stats` was undefined and every tile rendered 0.
    res.json({ stats });
  };
}
