import type { Prisma, PrismaClient, Role, User } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../db.js";

export type PublicUserProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  identifier: string | null;
  onboardedAt: Date | null;
};

export class UserRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<PublicUserProfile | null> {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        identifier: true,
        onboardedAt: true,
      },
    });
  }

  async findByIdentifier(
    identifier: string,
    excludeUserId?: string,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string } | null> {
    const client = tx ?? this.prisma;
    return client.user.findFirst({
      where: {
        identifier,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
  }

  async updateProfile(
    id: string,
    data: { name: string },
    tx?: Prisma.TransactionClient
  ): Promise<PublicUserProfile> {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        identifier: true,
        onboardedAt: true,
      },
    });
  }

  async onboard(
    id: string,
    data: { identifier: string; role: Role; onboardedAt: Date },
    tx?: Prisma.TransactionClient
  ): Promise<PublicUserProfile> {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        identifier: true,
        onboardedAt: true,
      },
    });
  }
}
