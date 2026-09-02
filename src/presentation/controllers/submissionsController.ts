import type { Request, Response } from "express";
import type { SubmissionWithUser } from "../../infrastructure/db/repositories/submissionRepository.js";
import { SubmitVerificationUseCase } from "../../application/use-cases/submitVerification.js";
import { ListSubmissionsUseCase } from "../../application/use-cases/listSubmissions.js";
import { GetSubmissionByIdUseCase } from "../../application/use-cases/getSubmissionById.js";
import { DeleteSubmissionUseCase } from "../../application/use-cases/deleteSubmission.js";
import {
  createSubmissionSchema,
  idParamSchema,
  listSubmissionsSchema,
} from "../../lib/validation.js";

export const serializeSubmission = (submission: SubmissionWithUser) => ({
  id: submission.id,
  hash: submission.hash,
  fileName: submission.fileName,
  previewUrl: submission.thumbnailUrl ?? "",
  checkedAt: submission.checkedAt.toISOString(),
  status: submission.status,
  reason: submission.reason,
  metadata: {
    captureTime: submission.captureTime,
    gps: {
      latitude: submission.latitude,
      longitude: submission.longitude,
    },
    device: submission.device,
    locationName: submission.locationName,
    completeness: submission.completeness,
    gpsTagsPresent: submission.gpsTagsPresent,
  },
  verification: {
    status: submission.status,
    reason: submission.reason,
    timeCheck: submission.timeCheck,
    locationCheck: submission.locationCheck,
    deviceCheck: submission.deviceCheck,
    duplicateCheck: submission.duplicateCheck,
    reused: submission.reused,
  },
  submittedBy: {
    name: submission.user.name,
    identifier: submission.user.identifier ?? "",
  },
});

export class SubmissionsController {
  constructor(
    private readonly submitVerificationUseCase: SubmitVerificationUseCase = new SubmitVerificationUseCase(),
    private readonly listSubmissionsUseCase: ListSubmissionsUseCase = new ListSubmissionsUseCase(),
    private readonly getSubmissionByIdUseCase: GetSubmissionByIdUseCase = new GetSubmissionByIdUseCase(),
    private readonly deleteSubmissionUseCase: DeleteSubmissionUseCase = new DeleteSubmissionUseCase()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const query = listSubmissionsSchema.parse(req.query);

    const result = await this.listSubmissionsUseCase.execute(user, query);

    res.json({
      submissions: result.submissions.map(serializeSubmission),
      nextCursor: result.nextCursor,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const body = createSubmissionSchema.parse(req.body);

    const result = await this.submitVerificationUseCase.execute(
      user.id,
      body,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }
    );

    res.status(201).json({
      submission: serializeSubmission(result.submission),
      duplicateOfOtherUser: result.duplicateOfOtherUser,
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = idParamSchema.parse(req.params);

    const submission = await this.getSubmissionByIdUseCase.execute(user, id);

    res.json({ submission: serializeSubmission(submission) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const { id } = idParamSchema.parse(req.params);

    await this.deleteSubmissionUseCase.execute(user, id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(204).end();
  };
}
