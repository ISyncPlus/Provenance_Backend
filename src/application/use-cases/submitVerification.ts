import { FileHash } from "../../domain/models/fileHash.js";
import { VerificationEngine } from "../../domain/services/verificationEngine.js";
import {
  SubmissionRepository,
  type SubmissionWithUser,
} from "../../infrastructure/db/repositories/submissionRepository.js";
import { AuditRepository } from "../../infrastructure/db/repositories/auditRepository.js";
import type { CreateSubmissionInput } from "../../lib/validation.js";

export interface ClientContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmitVerificationResult {
  submission: SubmissionWithUser;
  duplicateOfOtherUser: boolean;
}

export class SubmitVerificationUseCase {
  constructor(
    private readonly submissionRepo: SubmissionRepository = new SubmissionRepository(),
    private readonly auditRepo: AuditRepository = new AuditRepository()
  ) {}

  async execute(
    userId: string,
    input: CreateSubmissionInput,
    context?: ClientContext
  ): Promise<SubmitVerificationResult> {
    const fileHash = new FileHash(input.hash);
    const normalizedHash = fileHash.value;

    // Use PostgreSQL transaction advisory locking on the hash.
    // This serializes duplicate checks for identical file hashes even if
    // simultaneous requests arrive in the exact same millisecond.
    return this.submissionRepo.withHashLock(normalizedHash, async (tx) => {
      // 1. Global duplicate lookup across all students in the ledger
      const existing = await this.submissionRepo.findFirstByHash(
        normalizedHash,
        tx
      );

      // 2. Pure domain verification engine re-derives the verdict
      const outcome = VerificationEngine.verify(
        {
          captureTime: input.metadata.captureTime ?? null,
          latitude: input.metadata.latitude ?? null,
          longitude: input.metadata.longitude ?? null,
          device: input.metadata.device ?? null,
          locationName: input.metadata.locationName ?? null,
          gpsTagsPresent: input.metadata.gpsTagsPresent ?? false,
        },
        Boolean(existing)
      );

      // 3. Persist derived submission record
      const created = await this.submissionRepo.create(
        {
          userId,
          hash: normalizedHash,
          fileName: input.fileName,
          thumbnailUrl: input.thumbnailUrl ?? null,

          captureTime: input.metadata.captureTime ?? null,
          latitude: input.metadata.latitude ?? null,
          longitude: input.metadata.longitude ?? null,
          locationName: input.metadata.locationName ?? null,
          device: input.metadata.device ?? null,
          gpsTagsPresent: input.metadata.gpsTagsPresent ?? false,
          completeness: outcome.completeness,

          status: outcome.status,
          reason: outcome.reason,
          timeCheck: outcome.timeCheck,
          locationCheck: outcome.locationCheck,
          deviceCheck: outcome.deviceCheck,
          duplicateCheck: outcome.duplicateCheck,
          reused: outcome.reused,
          duplicateOfId: existing?.id ?? null,
        },
        tx
      );

      // 4. Record tamper-evident audit trail in the same transaction
      await this.auditRepo.log(
        {
          actorId: userId,
          action: "SUBMISSION_CREATED",
          targetId: created.id,
          details: {
            hash: normalizedHash,
            status: outcome.status,
            reused: outcome.reused,
            duplicateOfId: existing?.id ?? null,
            fileName: input.fileName,
          },
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        tx
      );

      return {
        submission: created,
        duplicateOfOtherUser: Boolean(existing && existing.userId !== userId),
      };
    });
  }
}
