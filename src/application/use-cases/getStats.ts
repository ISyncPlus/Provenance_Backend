import type { Prisma, Role } from "@prisma/client";
import { SubmissionRepository } from "../../infrastructure/db/repositories/submissionRepository.js";

export interface LedgerStats {
  total: number;
  verified: number;
  suspicious: number;
  reused: number;
  /** Distinct people who have filed within the caller's scope — the whole
   *  department for a lecturer, and only themselves for a student. */
  students: number;
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
