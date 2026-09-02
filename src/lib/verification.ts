import type { CheckResult, Completeness, VerificationStatus } from "@prisma/client";
import { VerificationEngine } from "../domain/services/verificationEngine.js";
import type {
  MetadataDomainInput,
  VerificationOutcome as DomainOutcome,
} from "../domain/models/verificationOutcome.js";

export type MetadataInput = {
  captureTime: string | null;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
};

export type VerificationOutcome = {
  status: VerificationStatus;
  reason: string;
  timeCheck: CheckResult;
  locationCheck: CheckResult;
  deviceCheck: CheckResult;
  duplicateCheck: CheckResult;
  reused: boolean;
  completeness: Completeness;
};

export const deriveCompleteness = (metadata: MetadataInput): Completeness => {
  return VerificationEngine.deriveCompleteness(metadata);
};

export const verifySubmission = (
  metadata: MetadataInput,
  isDuplicate: boolean
): VerificationOutcome => {
  return VerificationEngine.verify(metadata, isDuplicate);
};
