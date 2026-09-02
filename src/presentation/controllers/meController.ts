import type { Request, Response } from "express";
import { forbidden, badRequest } from "../../lib/httpError.js";
import { onboardingSchema } from "../../lib/validation.js";
import { UserRepository, type PublicUserProfile } from "../../infrastructure/db/repositories/userRepository.js";
import { OnboardUserUseCase } from "../../application/use-cases/onboardUser.js";

export const serializeUser = (user: PublicUserProfile) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  identifier: user.identifier,
  onboarded: Boolean(user.onboardedAt && user.identifier),
});

export class MeController {
  constructor(
    private readonly userRepo: UserRepository = new UserRepository(),
    private readonly onboardUserUseCase: OnboardUserUseCase = new OnboardUserUseCase()
  ) {}

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userRepo.findById(req.user!.id);
    if (!user) {
      throw forbidden("Your account no longer exists.");
    }
    res.json({ user: serializeUser(user) });
  };

  onboard = async (req: Request, res: Response): Promise<void> => {
    const current = req.user!;
    const body = onboardingSchema.parse(req.body);

    const updated = await this.onboardUserUseCase.execute(
      current,
      body,
      {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }
    );

    res.json({ user: serializeUser(updated) });
  };

  updateName = async (req: Request, res: Response): Promise<void> => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 120) {
      throw badRequest("Name must be between 2 and 120 characters.");
    }

    const updated = await this.userRepo.updateProfile(req.user!.id, { name });
    res.json({ user: serializeUser(updated) });
  };
}
