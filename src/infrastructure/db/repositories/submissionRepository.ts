import type { Prisma, PrismaClient, Submission } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../db.js";

export type SubmissionWithUser = Prisma.SubmissionGetPayload<{
  include: { user: { select: { name: true; identifier: true } } };
}>;

export const submissionWithUserInclude = {
  user: { select: { name: true, identifier: true } },
} as const satisfies Prisma.SubmissionInclude;

export interface FindSubmissionsQuery {
  where?: Prisma.SubmissionWhereInput;
  take: number;
  cursor?: string;
}

export class SubmissionRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  /**
   * Executes an operation inside a PostgreSQL transaction while holding a
   * transaction-level advisory lock on the given hash.
   *
   * This completely prevents race conditions when multiple concurrent requests
   * attempt to verify the exact same file hash simultaneously.
   */
  async withHashLock<T>(
    hash: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // hashtext() computes a 32-bit integer from the string, which pg_advisory_xact_lock locks until tx ends.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${hash}))`;
      return operation(tx);
    });
  }

  async findFirstByHash(
    hash: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; userId: string } | null> {
    const client = tx ?? this.prisma;
    return client.submission.findFirst({
      where: { hash },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true },
    });
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<SubmissionWithUser | null> {
    const client = tx ?? this.prisma;
    return client.submission.findUnique({
      where: { id },
      include: submissionWithUserInclude,
    });
  }

  async findMany(
    query: FindSubmissionsQuery,
    tx?: Prisma.TransactionClient
  ): Promise<SubmissionWithUser[]> {
    const client = tx ?? this.prisma;
    return client.submission.findMany({
      where: query.where,
      include: submissionWithUserInclude,
      orderBy: { createdAt: "desc" },
      take: query.take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  async create(
    data: Prisma.SubmissionUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<SubmissionWithUser> {
    const client = tx ?? this.prisma;
    return client.submission.create({
      data,
      include: submissionWithUserInclude,
    });
  }

  async deleteById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Submission> {
    const client = tx ?? this.prisma;
    return client.submission.delete({
      where: { id },
    });
  }

  async count(
    where?: Prisma.SubmissionWhereInput,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.submission.count({ where });
  }

  async countByStatus(
    where?: Prisma.SubmissionWhereInput,
    tx?: Prisma.TransactionClient
  ): Promise<{
    total: number;
    verified: number;
    suspicious: number;
    reused: number;
  }> {
    const client = tx ?? this.prisma;
    const [total, verified, suspicious, reused] = await Promise.all([
      client.submission.count({ where }),
      client.submission.count({ where: { ...where, status: "Verified" } }),
      client.submission.count({ where: { ...where, status: "Suspicious" } }),
      client.submission.count({ where: { ...where, status: "Reused" } }),
    ]);

    return { total, verified, suspicious, reused };
  }
}
