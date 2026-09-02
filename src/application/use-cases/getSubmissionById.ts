import { forbidden, notFound } from "../../lib/httpError.js";
import {
  SubmissionRepository,
  type SubmissionWithUser,
} from "../../infrastructure/db/repositories/submissionRepository.js";

export class GetSubmissionByIdUseCase {
  constructor(
    private readonly submissionRepo: SubmissionRepository = new SubmissionRepository()
  ) {}

  async execute(
    user: { id: string; role: "student" | "lecturer" },
    submissionId: string
  ): Promise<SubmissionWithUser> {
    const submission = await this.submissionRepo.findById(submissionId);

    if (!submission) {
      throw notFound("That submission does not exist.");
    }

    if (user.role !== "lecturer" && submission.userId !== user.id) {
      throw forbidden("That submission belongs to another student.");
    }

    return submission;
  }
}
