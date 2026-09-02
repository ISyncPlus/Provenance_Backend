import type { Request, Response } from "express";
import { GetStatsUseCase } from "../../application/use-cases/getStats.js";

export class StatsController {
  constructor(
    private readonly getStatsUseCase: GetStatsUseCase = new GetStatsUseCase()
  ) {}

  getStats = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.getStatsUseCase.execute(req.user!);
    res.json(stats);
  };
}
