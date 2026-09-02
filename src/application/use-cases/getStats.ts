import type { Prisma, Role } from "@prisma/client";
import { SubmissionRepository } from "../../infrastructure/db/repositories/submissionRepository.js";

export interface LedgerStats {
  total: number;
  verified: number;
  suspicious: number;
  reused: number;
}

export class GetStatsUseCase {
  constructor(
    private readonly submissionRepo: SubmissionRepository = new SubmissionRepository()
  ) {}

  async execute(user: { id: string; role: Role }): Promise<LedgerStats> {
    const where: Prisma.SubmissionWhereInput =
      user.role === "student" ? { userId: user.id } : {};

    return this.submissionRepo.countByStatus(where);
  }
}
