import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../db.js";

export type AuditAction =
  | "SUBMISSION_CREATED"
  | "SUBMISSION_DELETED"
  | "USER_ONBOARDED"
  | "USER_PROFILE_UPDATED";

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: AuditAction;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async log(
    params: CreateAuditLogParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          actorId: params.actorId ?? null,
          action: params.action,
          targetId: params.targetId ?? null,
          details: params.details ? (params.details as Prisma.InputJsonValue) : undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
    } catch (err) {
      // Audit logging should not silently crash the system, but should be logged to stderr in dev/prod.
      console.error("[AuditLog] Failed to record audit log entry:", err);
    }
  }
}
