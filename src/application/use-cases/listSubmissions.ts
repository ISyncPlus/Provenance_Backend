import type { Prisma } from "@prisma/client";
import {
  SubmissionRepository,
  type SubmissionWithUser,
} from "../../infrastructure/db/repositories/submissionRepository.js";
import type { ListSubmissionsInput } from "../../lib/validation.js";

export interface ListSubmissionsResult {
  submissions: SubmissionWithUser[];
  nextCursor: string | null;
}

export class ListSubmissionsUseCase {
  constructor(
    private readonly submissionRepo: SubmissionRepository = new SubmissionRepository()
  ) {}

  async execute(
    user: { id: string; role: "student" | "lecturer" },
    query: { status?: "Verified" | "Suspicious" | "Reused"; q?: string; take: number; cursor?: string }
  ): Promise<ListSubmissionsResult> {
    const where: Prisma.SubmissionWhereInput = {};

    if (user.role === "student") {
      where.userId = user.id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.q) {
      const contains = { contains: query.q, mode: "insensitive" as const };
      where.OR = [
        { fileName: contains },
        { hash: contains },
        { device: contains },
        { locationName: contains },
        ...(user.role === "lecturer"
          ? [
              { user: { name: contains } },
              { user: { identifier: contains } },
            ]
          : []),
      ];
    }

    const rows = await this.submissionRepo.findMany({
      where,
      take: query.take,
      cursor: query.cursor,
    });

    const hasMore = rows.length > query.take;
    const page = hasMore ? rows.slice(0, query.take) : rows;

    return {
      submissions: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }
}
