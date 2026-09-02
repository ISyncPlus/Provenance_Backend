import { Coordinates } from "../models/coordinates.js";
import type {
  CheckResult,
  Completeness,
  MetadataDomainInput,
  VerificationOutcome,
} from "../models/verificationOutcome.js";

/**
 * Domain Service: VerificationEngine
 *
 * Pure, deterministic verification engine evaluating metadata completeness,
 * coordinate validity, capture timestamps, device integrity, and duplicate flags.
 *
 * It is completely isolated from Express, Prisma, and external network dependencies.
 */
export class VerificationEngine {
  public static deriveCompleteness(metadata: MetadataDomainInput): Completeness {
    const coords = new Coordinates(metadata.latitude, metadata.longitude);
    const hasTime = this.hasUsableTime(metadata.captureTime);
    const hasLocation = coords.isUsable();
    const hasDevice = this.hasUsableDevice(metadata.device);

    const signals = [hasTime, hasLocation, hasDevice];
    const presentCount = signals.filter(Boolean).length;

    if (presentCount === signals.length) return "Complete";
    if (presentCount === 0) return "Missing";
    return "Partial";
  }

  public static verify(
    metadata: MetadataDomainInput,
    isDuplicate: boolean
  ): VerificationOutcome {
    const coords = new Coordinates(metadata.latitude, metadata.longitude);

    const timeCheck: CheckResult = this.hasUsableTime(metadata.captureTime)
      ? "Pass"
      : "Fail";
    const locationCheck: CheckResult = coords.isUsable() ? "Pass" : "Fail";
    const deviceCheck: CheckResult = this.hasUsableDevice(metadata.device)
      ? "Pass"
      : "Fail";
    const duplicateCheck: CheckResult = isDuplicate ? "Fail" : "Pass";
    const completeness = this.deriveCompleteness(metadata);

    if (isDuplicate) {
      return {
        status: "Reused",
        reason:
          "This image's SHA-256 hash matches a submission already in the ledger — the same file has been submitted before.",
        timeCheck,
        locationCheck,
        deviceCheck,
        duplicateCheck,
        reused: true,
        completeness,
      };
    }

    const failures: string[] = [];
    if (timeCheck === "Fail") failures.push("capture time");
    if (locationCheck === "Fail") failures.push("GPS location");
    if (deviceCheck === "Fail") failures.push("device information");

    if (failures.length === 0) {
      return {
        status: "Verified",
        reason:
          "Capture time, GPS location, and device information are all present and consistent, and the file has not been submitted before.",
        timeCheck,
        locationCheck,
        deviceCheck,
        duplicateCheck,
        reused: false,
        completeness,
      };
    }

    const missing =
      failures.length === 1
        ? failures[0]
        : `${failures.slice(0, -1).join(", ")} and ${failures[failures.length - 1]}`;

    return {
      status: "Suspicious",
      reason: `Missing or unreadable ${missing}. The metadata may have been stripped by an editor or messaging app, or altered.`,
      timeCheck,
      locationCheck,
      deviceCheck,
      duplicateCheck,
      reused: false,
      completeness,
    };
  }

  private static hasUsableTime(time: string | null | undefined): boolean {
    return Boolean(time && time.trim().length > 0);
  }

  private static hasUsableDevice(device: string | null | undefined): boolean {
    return Boolean(device && device.trim().length > 0);
  }
}
