export type VerificationStatus = "Verified" | "Suspicious" | "Reused";
export type CheckResult = "Pass" | "Fail";
export type Completeness = "Complete" | "Partial" | "Missing";

export type MetadataDomainInput = {
  captureTime: string | null;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
  locationName?: string | null;
  gpsTagsPresent?: boolean;
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
