import type { Role } from "@prisma/client";
import { env } from "../../env.js";
import { conflict, forbidden } from "../../lib/httpError.js";
import {
  UserRepository,
  type PublicUserProfile,
} from "../../infrastructure/db/repositories/userRepository.js";
import { AuditRepository } from "../../infrastructure/db/repositories/auditRepository.js";
import type { OnboardingInput } from "../../lib/validation.js";
import type { ClientContext } from "./submitVerification.js";

export class OnboardUserUseCase {
  constructor(
    private readonly userRepo: UserRepository = new UserRepository(),
    private readonly auditRepo: AuditRepository = new AuditRepository()
  ) {}

  async execute(
    user: { id: string; email: string; role: Role },
    input: { identifier: string; inviteCode?: string },
    context?: ClientContext
  ): Promise<PublicUserProfile> {
    let targetRole: Role = user.role;

    if (input.inviteCode) {
      if (!env.LECTURER_INVITE_CODE) {
        throw forbidden(
          "Reviewer access is not enabled on this deployment. Contact the department."
        );
      }
      if (input.inviteCode !== env.LECTURER_INVITE_CODE) {
        throw forbidden("That reviewer invite code is not valid.");
      }
      if (
        env.lecturerAllowlist.length > 0 &&
        !env.lecturerAllowlist.includes(user.email.toLowerCase())
      ) {
        throw forbidden(
          "This email address is not on the approved reviewer list."
        );
      }
      targetRole = "lecturer";
    }

    // Check if registration number / staff ID is already claimed
    const taken = await this.userRepo.findByIdentifier(
      input.identifier,
      user.id
    );
    if (taken) {
      throw conflict(
        "That registration number or staff ID is already claimed by another account."
      );
    }

    const updated = await this.userRepo.onboard(user.id, {
      identifier: input.identifier,
      role: targetRole,
      onboardedAt: new Date(),
    });

    await this.auditRepo.log({
      actorId: user.id,
      action: "USER_ONBOARDED",
      targetId: user.id,
      details: {
        role: targetRole,
        identifier: input.identifier,
        promotedToReviewer: targetRole === "lecturer",
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    return updated;
  }
}
