import { forbidden, notFound } from "../../lib/httpError.js";
import { SubmissionRepository } from "../../infrastructure/db/repositories/submissionRepository.js";
import { AuditRepository } from "../../infrastructure/db/repositories/auditRepository.js";
import type { ClientContext } from "./submitVerification.js";

export class DeleteSubmissionUseCase {
  constructor(
    private readonly submissionRepo: SubmissionRepository = new SubmissionRepository(),
    private readonly auditRepo: AuditRepository = new AuditRepository()
  ) {}

  async execute(
    user: { id: string; role: "student" | "lecturer" },
    submissionId: string,
    context?: ClientContext
  ): Promise<void> {
    if (user.role !== "lecturer") {
      throw forbidden("Submissions can only be removed by a departmental reviewer.");
    }

    const existing = await this.submissionRepo.findById(submissionId);
    if (!existing) {
      throw notFound("That submission does not exist.");
    }

    await this.submissionRepo.deleteById(submissionId);

    await this.auditRepo.log({
      actorId: user.id,
      action: "SUBMISSION_DELETED",
      targetId: submissionId,
      details: {
        hash: existing.hash,
        fileName: existing.fileName,
        studentId: existing.userId,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }
}
